import { useState } from "react";
import { Search, Download, Eye, Edit, Trash2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { toast } from "sonner";

const initialRecords = [
  {
    id: 1,
    userId: 101,
    name: "Nguyễn Văn A",
    avatar: "NVA",
    date: "27/10/2024",
    checkIn: "08:45",
    checkOut: "17:30",
    hours: "8h 45m",
    status: "ontime",
    location: "Văn phòng HN",
  },
  {
    id: 2,
    userId: 102,
    name: "Trần Thị B",
    avatar: "TTB",
    date: "27/10/2024",
    checkIn: "09:15",
    checkOut: "17:35",
    hours: "8h 20m",
    status: "late",
    location: "Văn phòng HN",
  },
  {
    id: 3,
    userId: 103,
    name: "Lê Văn C",
    avatar: "LVC",
    date: "27/10/2024",
    checkIn: "08:30",
    checkOut: "17:20",
    hours: "8h 50m",
    status: "ontime",
    location: "Văn phòng HN",
  },
  {
    id: 4,
    userId: 104,
    name: "Phạm Thị D",
    avatar: "PTD",
    date: "27/10/2024",
    checkIn: "-",
    checkOut: "-",
    hours: "-",
    status: "absent",
    location: "-",
  },
  {
    id: 5,
    userId: 105,
    name: "Hoàng Văn E",
    avatar: "HVE",
    date: "27/10/2024",
    checkIn: "08:50",
    checkOut: "17:25",
    hours: "8h 35m",
    status: "ontime",
    location: "Văn phòng HN",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ontime":
      return (
        <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">
          Đúng giờ
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">
          Đi muộn
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">
          Vắng
        </Badge>
      );
    default:
      return null;
  }
};

export default function AdminAttendancePage() {
  const [records, setRecords] = useState(initialRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<
    (typeof initialRecords)[0] | null
  >(null);
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    location: "",
  });

  const handleViewRecord = (record: (typeof initialRecords)[0]) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleEditRecord = (record: (typeof initialRecords)[0]) => {
    setSelectedRecord(record);
    setFormData({
      checkIn: record.checkIn === "-" ? "" : record.checkIn,
      checkOut: record.checkOut === "-" ? "" : record.checkOut,
      location: record.location === "-" ? "" : record.location,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteRecord = (record: (typeof initialRecords)[0]) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-")
      return "-";

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const handleSubmitEdit = () => {
    if (!selectedRecord) return;

    const hours = calculateHours(formData.checkIn, formData.checkOut);
    let status = "ontime";

    if (!formData.checkIn || !formData.checkOut) {
      status = "absent";
    } else {
      const [inH, inM] = formData.checkIn.split(":").map(Number);
      if (inH > 8 || (inH === 8 && inM > 0)) status = "late";
    }

    setRecords(
      records.map((r) =>
        r.id === selectedRecord.id
          ? {
              ...r,
              checkIn: formData.checkIn || "-",
              checkOut: formData.checkOut || "-",
              location: formData.location || "-",
              hours,
              status,
            }
          : r
      )
    );

    toast.success(`✅ Đã cập nhật thông tin chấm công`);
    setIsEditDialogOpen(false);
    setSelectedRecord(null);
  };

  const confirmDelete = () => {
    if (!selectedRecord) return;

    setRecords(records.filter((r) => r.id !== selectedRecord.id));
    toast.success(`🗑️ Đã xóa bản ghi chấm công`);
    setIsDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-main)]">Quản lý chấm công</h1>
        <p className="text-[var(--text-sub)]">
          Xem và quản lý chấm công của nhân viên
        </p>
      </div>

      {/* Filters & Actions */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder="Tìm theo tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
            />
            <Button
              variant="outline"
              className="border-[var(--border)] text-[var(--text-main)]"
              onClick={() => toast.success("📊 Đang xuất file Excel...")}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">Tổng NV</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">52</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">Có mặt</p>
            <p className="text-2xl text-[var(--success)] mt-1">47</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">Đi muộn</p>
            <p className="text-2xl text-[var(--warning)] mt-1">3</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">Vắng</p>
            <p className="text-2xl text-[var(--error)] mt-1">2</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            Danh sách chấm công hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Nhân viên
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Ngày
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Giờ vào
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Giờ ra
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Tổng giờ
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Địa điểm
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    Trạng thái
                  </th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${
                      index % 2 === 0 ? "bg-[var(--shell)]/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[var(--primary)] text-white text-xs">
                            {record.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[var(--text-main)]">
                            {record.name}
                          </p>
                          <p className="text-xs text-[var(--text-sub)]">
                            ID: {record.userId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-main)]">
                      {record.date}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-main)]">
                      {record.checkIn}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-main)]">
                      {record.checkOut}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-main)]">
                      {record.hours}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-sub)]">
                      {record.location}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewRecord(record)}
                          className="p-1 hover:bg-[var(--shell)] rounded text-[var(--accent-cyan)]"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-1 hover:bg-[var(--shell)] rounded text-[var(--primary)]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record)}
                          className="p-1 hover:bg-[var(--shell)] rounded text-[var(--error)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết chấm công</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Thông tin chi tiết về bản ghi chấm công
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-lg">
                    {selectedRecord.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg text-[var(--text-main)]">
                    {selectedRecord.name}
                  </h3>
                  <p className="text-[var(--text-sub)]">
                    ID: {selectedRecord.userId}
                  </p>
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              <Separator className="bg-[var(--border)]" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--text-sub)]">Ngày</Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedRecord.date}
                  </p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">Giờ vào</Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedRecord.checkIn}
                  </p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">Giờ ra</Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedRecord.checkOut}
                  </p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">Tổng giờ làm</Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedRecord.hours}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-[var(--text-sub)] flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Địa điểm
                  </Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedRecord.location}
                  </p>
                </div>
              </div>

              <Separator className="bg-[var(--border)]" />

              <div>
                <Label className="text-[var(--text-sub)]">
                  Thông tin bổ sung
                </Label>
                <div className="mt-3 p-4 bg-[var(--shell)] rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-sub)]">
                      Phương thức chấm công:
                    </span>
                    <span className="text-[var(--text-main)]">QR Code</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-sub)]">Tọa độ GPS:</span>
                    <span className="text-[var(--text-main)]">
                      21.0285° N, 105.8542° E
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-sub)]">Thiết bị:</span>
                    <span className="text-[var(--text-main)]">Mobile App</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bản ghi chấm công</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Cập nhật thông tin chấm công cho {selectedRecord?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ vào</Label>
                <Input
                  type="time"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.checkIn}
                  onChange={(e) =>
                    setFormData({ ...formData, checkIn: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Giờ ra</Label>
                <Input
                  type="time"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.checkOut}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOut: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Địa điểm</Label>
              <Input
                placeholder="Văn phòng HN"
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmitEdit}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bản ghi</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn xóa bản ghi chấm công này?
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="py-4">
              <div className="flex items-center space-x-3 p-4 bg-[var(--shell)] rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-[var(--error)] text-white">
                    {selectedRecord.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[var(--text-main)]">
                    {selectedRecord.name}
                  </p>
                  <p className="text-sm text-[var(--text-sub)]">
                    {selectedRecord.date}
                  </p>
                  <p className="text-xs text-[var(--text-sub)]">
                    {selectedRecord.checkIn} - {selectedRecord.checkOut}
                  </p>
                </div>
              </div>
              <p className="text-[var(--error)] text-sm mt-4">
                ⚠️ Hành động này không thể hoàn tác. Bản ghi chấm công sẽ bị xóa
                vĩnh viễn.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white"
            >
              Xóa bản ghi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
