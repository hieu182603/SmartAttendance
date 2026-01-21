"""Model loader for InsightFace models"""
import insightface
from app.utils.config import MODEL_NAME, LOG_LEVEL
import logging

logger = logging.getLogger(__name__)

class ModelLoader:
    """Singleton class to load and manage InsightFace models"""
    
    _instance = None
    _app = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_model(self):
        """Load InsightFace model (will download if not exists)"""
        if self._app is None:
            try:
                logger.info(f"Loading InsightFace model: {MODEL_NAME}")
                self._app = insightface.app.FaceAnalysis(
                    name=MODEL_NAME,
                    providers=['CPUExecutionProvider', 'CUDAExecutionProvider']
                )
                self._app.prepare(ctx_id=0, det_size=(640, 640))
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading model: {str(e)}")
                raise
        return self._app
    
    def get_model(self):
        """Get loaded model instance"""
        if self._app is None:
            return self.load_model()
        return self._app













