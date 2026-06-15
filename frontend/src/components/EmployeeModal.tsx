import React from 'react';
import type { Employee } from '../data/mockData';
import { Check } from '@phosphor-icons/react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  empForm: Employee;
  setEmpForm: React.Dispatch<React.SetStateAction<Employee>>;
  empFormMode: 'add' | 'edit';
  onSubmit: (e: React.FormEvent) => void;
}

export function EmployeeModal({
  isOpen,
  onClose,
  empForm,
  setEmpForm,
  empFormMode,
  onSubmit,
}: EmployeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form 
        onSubmit={onSubmit} 
        className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-zinc-800 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase">
            {empFormMode === 'add' ? 'Thêm Nhân Viên Mới' : 'Cập Nhật Thông Tin Nhân Viên'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
          >
            Đóng
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Mã nhân viên (ID)</label>
            <input
              type="text"
              required={empForm.level !== 'HUB'}
              disabled={empFormMode === 'edit' || empForm.level === 'HUB'}
              value={empForm.level === 'HUB' ? '' : empForm.id}
              onChange={(e) => setEmpForm(prev => ({ ...prev, id: e.target.value.trim() }))}
              placeholder={empForm.level === 'HUB' ? "Tự động tạo (Không hiển thị)" : "Ví dụ: 1048964"}
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 disabled:bg-zinc-100 disabled:text-zinc-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Họ và Tên</label>
            <input
              type="text"
              required
              value={empForm.name}
              onChange={(e) => setEmpForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ví dụ: Nguyễn Văn Hân"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Số điện thoại</label>
            <input
              type="text"
              required
              value={empForm.phone}
              onChange={(e) => setEmpForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Ví dụ: 0357.516.001"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Vai trò hệ thống</label>
            <select
              value={empForm.role}
              onChange={(e) =>
                setEmpForm(prev => ({
                  ...prev,
                  role: e.target.value as Employee['role'],
                }))
              }
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-semibold"
            >
              <option value="employee">Nhân viên</option>
              <option value="manager">Quản lý (Có quyền xếp ca)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Level chuyên môn</label>
            <select
              value={empForm.level}
              onChange={(e) => setEmpForm(prev => ({ ...prev, level: e.target.value }))}
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-semibold"
            >
              <option value="QLC">QLC (Quản lý ca)</option>
              <option value="RM">RM (Quản lý nhà hàng)</option>
              <option value="S1.1">S1.1</option>
              <option value="S1.2">S1.2</option>
              <option value="S1.3">S1.3</option>
              <option value="S2.1">S2.1</option>
              <option value="S2.2">S2.2</option>
              <option value="S2.3">S2.3</option>
              <option value="S3.1">S3.1</option>
              <option value="S3.2">S3.2</option>
              <option value="S3.3">S3.3</option>
              <option value="HUB">HUB (Nhân sự độc lập)</option>
              <option value="NEW">New (Nhân viên mới)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Nhóm trên Bảng Lịch</label>
            <select
              value={empForm.scheduleGroup}
              onChange={(e) => setEmpForm(prev => ({ ...prev, scheduleGroup: e.target.value }))}
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            >
              <option value="BAN QUẢN LÝ">BAN QUẢN LÝ</option>
              <option value="ORDER + PHỤC VỤ">ORDER + PHỤC VỤ</option>
              <option value="BOY">BOY</option>
              <option value="BOH (BẾP)">BOH (BẾP)</option>
              <option value="TẠP VỤ">TẠP VỤ</option>
              <option value="BAR">BAR</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Bộ phận chính (Roster Code)</label>
            <select
              value={empForm.primaryDepartment}
              onChange={(e) => setEmpForm(prev => ({ ...prev, primaryDepartment: e.target.value }))}
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            >
              <option value="Quản lý">Quản lý</option>
              <option value="FOH">FOH (Phục vụ / Bar / Thu ngân)</option>
              <option value="BOH">BOH (Bếp / Thịt / Salad)</option>
              <option value="Tạp vụ">Tạp vụ</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Ghi chú nhân sự</label>
            <input
              type="text"
              value={empForm.note || ''}
              onChange={(e) => setEmpForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Ví dụ: Chỉ rảnh cuối tuần..."
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Skills Matrix */}
        <div className="border-t border-zinc-100 pt-3 space-y-2">
          <h4 className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Kỹ năng chuyên môn (Biết làm)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Order', 'Phục vụ', 'Boy', 'Bếp nóng', 'Bếp salad', 'Bếp thịt', 'Tạp vụ', 'Bar'].map((skill) => {
              const hasSkill = !!empForm.skills[skill];
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    setEmpForm(prev => ({
                      ...prev,
                      skills: {
                        ...prev.skills,
                        [skill]: !hasSkill
                      }
                    }));
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    hasSkill
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm font-semibold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-350'
                  }`}
                >
                  <span className="text-[11px] font-bold">{skill}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    hasSkill ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-zinc-300'
                  }`}>
                    {hasSkill && <Check size={10} weight="bold" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors border border-zinc-300"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#f4b084] hover:bg-[#e29d71] text-zinc-950 text-xs font-extrabold rounded-lg transition-colors border border-[#e29d71]"
          >
            Lưu Nhân Viên
          </button>
        </div>
      </form>
    </div>
  );
}
