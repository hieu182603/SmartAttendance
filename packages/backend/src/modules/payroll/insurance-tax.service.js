import { INSURANCE_CONFIG, TAX_CONFIG } from "../../config/payroll.config.js";

const roundSalary = (amount) => Math.round((amount || 0) / 1000) * 1000;

/**
 * Tính bảo hiểm xã hội/y tế/thất nghiệp (người lao động đóng)
 *
 * Mức đóng dựa trên baseSalary (lương hợp đồng), không phải grossSalary.
 * Cap BHXH/BHYT = 46.8tr, cap BHTN = 99.2tr (Nghị định 38/2022).
 *
 * @param {number} baseSalary - Lương theo hợp đồng
 */
export function calculateInsurance(baseSalary) {
  const { EMPLOYEE_RATES, CAP_SOCIAL_HEALTH, CAP_UNEMPLOYMENT } = INSURANCE_CONFIG;
  const socialHealthBase = Math.min(baseSalary, CAP_SOCIAL_HEALTH);
  const utBase = Math.min(baseSalary, CAP_UNEMPLOYMENT);

  const social = roundSalary(socialHealthBase * EMPLOYEE_RATES.SOCIAL);
  const health = roundSalary(socialHealthBase * EMPLOYEE_RATES.HEALTH);
  const unemployment = roundSalary(utBase * EMPLOYEE_RATES.UNEMPLOYMENT);
  const total = social + health + unemployment;

  return { social, health, unemployment, total, base: socialHealthBase };
}

/**
 * Tính thuế TNCN theo biểu lũy tiến từng phần (Thông tư 111/2013)
 *
 * @param {number} grossSalary - Tổng thu nhập trước thuế
 * @param {number} insuranceTotal - Tổng bảo hiểm đã đóng (được trừ trước khi tính thuế)
 * @param {number} dependentCount - Số người phụ thuộc được giảm trừ
 */
export function calculatePersonalIncomeTax(grossSalary, insuranceTotal, dependentCount = 0) {
  const incomeAfterInsurance = grossSalary - insuranceTotal;
  const personalDed = TAX_CONFIG.PERSONAL_DEDUCTION;
  const dependentDed = dependentCount * TAX_CONFIG.DEPENDENT_DEDUCTION;
  const taxableAfterDeduction = Math.max(0, incomeAfterInsurance - personalDed - dependentDed);

  let tax = 0;
  let prevCap = 0;
  const bracketBreakdown = [];

  for (const b of TAX_CONFIG.BRACKETS) {
    if (taxableAfterDeduction <= prevCap) break;
    const slice = Math.min(taxableAfterDeduction, b.upTo === Infinity ? taxableAfterDeduction : b.upTo) - prevCap;
    const sliceTax = slice * b.rate;
    tax += sliceTax;
    bracketBreakdown.push({
      bracket: `${prevCap.toLocaleString("vi-VN")} – ${b.upTo === Infinity ? "∞" : b.upTo.toLocaleString("vi-VN")}`,
      amount: Math.round(slice),
      tax: roundSalary(sliceTax),
    });
    prevCap = b.upTo === Infinity ? taxableAfterDeduction : b.upTo;
  }

  return {
    taxableIncome: Math.round(incomeAfterInsurance),
    personalDeduction: personalDed,
    dependentCount,
    dependentDeduction: dependentDed,
    taxableAfterDeduction: Math.round(taxableAfterDeduction),
    amount: roundSalary(tax),
    bracketBreakdown,
  };
}
