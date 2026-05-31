"""AI usage tracking — records token consumption per company to MongoDB."""
import logging
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

from app.utils.config import MAIN_MONGODB_URI, calc_cost_usd, AI_USD_TO_VND

logger = logging.getLogger(__name__)

# Lazy singleton motor client (ai-service already has one in rag_service;
# we create a dedicated lightweight client here to keep tracking independent).
_client: Optional[AsyncIOMotorClient] = None


def _get_collection():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MAIN_MONGODB_URI)
    db = _client.get_database()
    return db["ai_usage_events"]


def extract_token_usage(response) -> tuple[int, int, bool]:
    """Extract (prompt_tokens, completion_tokens, estimated) from a LangChain AIMessage.

    Falls back to tiktoken-style estimate (len(content)//4) when metadata is absent.
    """
    try:
        meta = getattr(response, "usage_metadata", None)
        if meta:
            prompt = int(getattr(meta, "input_tokens", 0) or getattr(meta, "prompt_token_count", 0) or 0)
            completion = int(getattr(meta, "output_tokens", 0) or getattr(meta, "candidates_token_count", 0) or 0)
            if prompt > 0 or completion > 0:
                return prompt, completion, False
    except Exception:
        pass

    # Fallback: rough estimate from content length
    content = getattr(response, "content", "") or ""
    if isinstance(content, str):
        estimated_tokens = max(1, len(content) // 4)
        return estimated_tokens, estimated_tokens // 4, True
    return 1, 1, True


async def record_usage(
    *,
    company_id: Optional[str],
    user_id: str,
    operation: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    conversation_id: Optional[str] = None,
    estimated: bool = False,
) -> None:
    """Insert one usage event into ai_usage_events collection."""
    if not company_id:
        logger.warning("record_usage called without company_id — skipping insert (operation=%s)", operation)
        return

    total_tokens = prompt_tokens + completion_tokens
    cost_usd = calc_cost_usd(model, prompt_tokens, completion_tokens)
    cost_vnd = round(cost_usd * AI_USD_TO_VND)

    doc = {
        "companyId": company_id,
        "userId": user_id,
        "service": "rag",
        "operation": operation,
        "model": model,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
        "estimatedCostUsd": round(cost_usd, 8),
        "estimatedCostVnd": cost_vnd,
        "estimated": estimated,
        "conversationId": conversation_id,
        "createdAt": datetime.now(timezone.utc),
    }

    try:
        collection = _get_collection()
        await collection.insert_one(doc)
        logger.debug(
            "usage recorded company=%s op=%s model=%s tokens=%d costVnd=%d",
            company_id, operation, model, total_tokens, cost_vnd,
        )
    except Exception as exc:
        # Never let billing tracking break the chat flow
        logger.error("Failed to record usage event: %s", exc)


async def invoke_llm_with_usage(
    llm,
    prompt,
    *,
    company_id: Optional[str],
    user_id: str,
    operation: str,
    conversation_id: Optional[str] = None,
):
    """Invoke LLM, record token usage, return the response."""
    response = await llm.ainvoke(prompt)
    prompt_tokens, completion_tokens, estimated = extract_token_usage(response)
    model = getattr(llm, "model", "gemini-2.5-flash") or "gemini-2.5-flash"
    await record_usage(
        company_id=company_id,
        user_id=user_id,
        operation=operation,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        conversation_id=conversation_id,
        estimated=estimated,
    )
    return response


async def embed_query_with_usage(
    embeddings,
    text: str,
    *,
    company_id: Optional[str],
    user_id: str,
    operation: str = "embedding",
) -> list:
    """Embed text, record estimated token usage (embeddings have no metadata), return vector."""
    try:
        result = await embeddings.aembed_query(text)
    except AttributeError:
        result = embeddings.embed_query(text)

    # Embeddings API typically doesn't return token counts — estimate from text length
    estimated_tokens = max(1, len(text) // 4)
    await record_usage(
        company_id=company_id,
        user_id=user_id,
        operation=operation,
        model="gemini-embedding-001",
        prompt_tokens=estimated_tokens,
        completion_tokens=0,
        estimated=True,
    )
    return result
