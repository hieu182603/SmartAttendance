import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Briefcase,
  FileX,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  getSalaryMatrix,
  createSalaryMatrix,
  updateSalaryMatrix,
  deleteSalaryMatrix,
  getPositions,
  type SalaryMatrix,
  type CreateSalaryMatrixPayload,
  type UpdateSalaryMatrixPayload,
} from "../../../services/payrollService";
import { getAllDepartments } from "../../../services/departmentService";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export default function SalaryMatrixManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [salaryMatrix, setSalaryMatrix] = useState<SalaryMatrix[]>([]);
  const [departments, setDepartments] = useState<Array<{ code: string; name: string }>>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryMatrix | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [formData, setFormData] = useState<CreateSalaryMatrixPayload>({
    departmentCode: "",
    position: "",
    baseSalary: 0,
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const deptResponse = await getAllDepartments({ limit: 1000 });
        const depts = deptResponse.departments?.map((d: any) => ({
          code: d.code,
          name: d.name,
        })) || [];
        setDepartments(depts);

        // Fetch positions
        const posList = await getPositions();
        setPositions(posList);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const fetchSalaryMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const params: {
        departmentCode?: string;
        position?: string;
        isActive?: boolean;
        page: number;
        limit: number;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterDepartment !== "all") {
        params.departmentCode = filterDepartment;
      }
      if (searchTerm) {
        params.position = searchTerm;
      }
      if (filterActive !== "all") {
        params.isActive = filterActive;
      }

      const response = await getSalaryMatrix(params);
      setSalaryMatrix(response.records || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching salary matrix:", error);
      toast.error(
        error.response?.data?.message || "Không lấy được danh sách thang lương"
      );
      setSalaryMatrix([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filterDepartment, filterActive, searchTerm]);

  useEffect(() => {
    fetchSalaryMatrix();
  }, [fetchSalaryMatrix]);

  const handleCreate = async () => {
    if (!formData.departmentCode || !formData.position || formData.baseSalary <= 0) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setLoadingAction(true);
      await createSalaryMatrix(formData);
      toast.success("Đã tạo thang lương thành công");
      setIsCreateDialogOpen(false);
      setFormData({
        departmentCode: "",
        position: "",
        baseSalary: 0,
        notes: "",
        isActive: true,
      });
      fetchSalaryMatrix();
    } catch (error: any) {
      console.error("Error creating salary matrix:", error);
      toast.error(
        error.response?.data?.message || "Không tạo được thang lương"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRecord) return;

    const updatePayload: UpdateSalaryMatrixPayload = {
      baseSalary: formData.baseSalary,
      notes: formData.notes,
      isActive: formData.isActive,
    };

    try {
      setLoadingAction(true);
      await updateSalaryMatrix(selectedRecord._id, updatePayload);
      toast.success("Đã cập nhật thang lương thành công");
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      fetchSalaryMatrix();
    } catch (error: any) {
      console.error("Error updating salary matrix:", error);
      toast.error(
        error.response?.data?.message || "Không cập nhật được thang lương"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    try {
      setLoadingAction(true);
      await deleteSalaryMatrix(selectedRecord._id);
      toast.success("Đã xóa thang lương thành công");
      setIsDeleteDialogOpen(false);
      setSelectedRecord(null);
      fetchSalaryMatrix();
    } catch (error: any) {
      console.error("Error deleting salary matrix:", error);
      toast.error(
        error.response?.data?.message || "Không xóa được thang lương"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const openEditDialog = (record: SalaryMatrix) => {
    setSelectedRecord(record);
    setFormData({
      departmentCode: record.departmentCode,
      position: record.position,
      baseSalary: record.baseSalary,
      notes: record.notes || "",
      isActive: record.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (record: SalaryMatrix) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  // Server now handles position filtering with partial matching via regex
  // No need for additional client-side filtering
  const filteredData = salaryMatrix;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">
            Quản Lý Thang Lương
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            Quản lý lương cơ bản theo phòng ban và chức vụ
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm Thang Lương
        </Button>
      </div>

      <Card className="border-[var(--border)] bg-[var(--shell)]">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-3 w-3 text-[var(--text-sub)]" />
              <Input
                placeholder="Tìm kiếm theo chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[var(--border)]"
              />
            </div>
            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger className="border-[var(--border)]">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.code} value={dept.code}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(filterActive)}
              onValueChange={(value) =>
                setFilterActive(value === "all" ? "all" : value === "true")
              }
            >
              <SelectTrigger className="border-[var(--border)]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="true">Đang hoạt động</SelectItem>
                <SelectItem value="false">Đã vô hiệu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--shell)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            Danh Sách Thang Lương ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-[var(--text-sub)]">
              Đang tải...
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--border)]">
                    <TableHead className="text-[var(--text-main)]">Phòng Ban</TableHead>
                    <TableHead className="text-[var(--text-main)]">Chức Vụ</TableHead>
                    <TableHead className="text-[var(--text-main)] text-right">
                      Lương Cơ Bản
                    </TableHead>
                    <TableHead className="text-[var(--text-main)]">Ghi Chú</TableHead>
                    <TableHead className="text-[var(--text-main)]">Trạng Thái</TableHead>
                    <TableHead className="text-[var(--text-main)] text-right">
                      Thao Tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => (
                    <TableRow
                      key={record._id}
                      className="border-[var(--border)] hover:bg-[var(--shell)]"
                    >
                      <TableCell className="text-[var(--text-main)]">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[var(--text-sub)]" />
                          {record.departmentCode}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-main)]">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-[var(--text-sub)]" />
                          {record.position}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-main)] font-semibold">
                        {formatCurrency(record.baseSalary)}
                      </TableCell>
                      <TableCell className="text-[var(--text-sub)] max-w-xs truncate">
                        {record.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={record.isActive ? "success" : "outline"}
                          className={
                            record.isActive
                              ? "bg-green-500/20 text-green-500"
                              : "bg-gray-500/20 text-gray-500"
                          }
                        >
                          {record.isActive ? "Hoạt động" : "Vô hiệu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(record)}
                            className="h-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(record)}
                            className="h-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <FileX className="h-12 w-12 text-[var(--text-sub)] opacity-50" />
              <p className="text-[var(--text-sub)] text-center">
                Không tìm thấy dữ liệu
              </p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-[var(--text-sub)]">
                Trang {pagination.page} / {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-[var(--border)]"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages, p + 1)
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                  className="border-[var(--border)]"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--background)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-main)]">
              Thêm Thang Lương
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Thêm lương cơ bản cho chức vụ mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Phòng Ban *
              </label>
              <Select
                value={formData.departmentCode}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentCode: value })
                }
              >
                <SelectTrigger className="mt-1 border-[var(--border)]">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Chức Vụ *
              </label>
              <Select
                value={formData.position}
                onValueChange={(value) =>
                  setFormData({ ...formData, position: value })
                }
              >
                <SelectTrigger className="mt-1 border-[var(--border)]">
                  <SelectValue placeholder="Chọn chức vụ" />
                </SelectTrigger>
                <SelectContent>
                  {positions.length > 0 ? (
                    positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="">
                      Chưa có chức vụ nào
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Lương Cơ Bản (VNĐ) *
              </label>
              <Input
                type="number"
                value={formData.baseSalary || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    baseSalary: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="30000000"
                className="mt-1 border-[var(--border)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Ghi Chú
              </label>
              <Input
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Ghi chú (tùy chọn)"
                className="mt-1 border-[var(--border)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-[var(--border)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loadingAction}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {loadingAction ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--background)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-main)]">
              Chỉnh Sửa Thang Lương
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {selectedRecord?.departmentCode} - {selectedRecord?.position}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Phòng Ban
              </label>
              <Input
                value={formData.departmentCode}
                disabled
                className="mt-1 border-[var(--border)] bg-gray-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Chức Vụ
              </label>
              <Input
                value={formData.position}
                disabled
                className="mt-1 border-[var(--border)] bg-gray-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Lương Cơ Bản (VNĐ) *
              </label>
              <Input
                type="number"
                value={formData.baseSalary || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    baseSalary: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 border-[var(--border)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Ghi Chú
              </label>
              <Input
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="mt-1 border-[var(--border)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]">
                Trạng Thái
              </label>
              <Select
                value={String(formData.isActive)}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value === "true" })
                }
              >
                <SelectTrigger className="mt-1 border-[var(--border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Hoạt động</SelectItem>
                  <SelectItem value="false">Vô hiệu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-[var(--border)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleEdit}
              disabled={loadingAction}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {loadingAction ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--background)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-main)]">
              Xóa Thang Lương
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn xóa thang lương này? Hành động này sẽ vô hiệu hóa
              thang lương (soft delete).
              <br />
              <br />
              <strong>
                {selectedRecord?.departmentCode} - {selectedRecord?.position}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loadingAction}
              variant="outline"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              {loadingAction ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

