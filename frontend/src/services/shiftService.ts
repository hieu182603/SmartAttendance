// src/services/shiftService.ts
import api from "./api"; // chính là file bạn vừa gửi

const shiftService = {
  // Lấy tất cả các loại ca làm việc (Ca sáng, Ca chiều, Ca đêm...)
  getAllShifts: async () => {
    const response = await api.get("/shifts");
    // Backend của bạn trả: { success: true, data: [...] }
    return response.data.data;
  },

  // (Sau này dùng) Lấy ca của nhân viên theo tháng, hôm nay, v.v.
  // getMyShifts: (params?: { month?: number; year?: number }) =>
  //   api.get('/employee-shifts/my', { params }).then(res => res.data.data),
};

export default shiftService;
