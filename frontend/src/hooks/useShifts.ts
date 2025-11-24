// src/hooks/useShifts.ts
import { useEffect, useState } from "react";
import shiftService from "../services/shiftService";
import { ValidationError } from "../services/api";

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isFlexible: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useShifts = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getAllShifts();
      setShifts(data);
    } catch (err: any) {
      // Dùng đúng kiểu lỗi mà interceptor của bạn trả về
      const apiError = err as ValidationError;
      const message = apiError.message || "Không thể tải danh sách ca làm việc";
      setError(message);
      console.error("Lỗi khi lấy shifts:", apiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return {
    shifts,
    loading,
    error,
    refetch: fetchShifts,
  };
};
