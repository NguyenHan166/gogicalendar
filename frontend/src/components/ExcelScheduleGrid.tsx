import { daysOfWeek, scheduleGroupOrder } from '../data/mockData';
import { useScheduleStore } from '../store/useScheduleStore';
import { useState } from 'react';
import { MagnifyingGlass, X, Check, FileXls } from '@phosphor-icons/react';
import * as XLSX from 'xlsx-js-style';

export function ExcelScheduleGrid() {
  const { employees, shiftCodes, schedules, currentWeekId, addAssignment, removeAssignment, updateForecast, currentUser, showToast } = useScheduleStore();
  const activeSchedule = schedules.find(s => s.weekId === currentWeekId) || schedules[0];
  const isManager = currentUser?.role === 'manager';
  const isEditable =
    isManager &&
    ['registration_locked', 'scheduling', 'published'].includes(activeSchedule.status);

  const [copyToast, setCopyToast] = useState<string | null>(null);

  const triggerCopy = (text: string, typeLabel: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(`${typeLabel}: ${text}`);
      setTimeout(() => setCopyToast(null), 2000);
    }).catch(() => {});
  };

  const [pickerCell, setPickerCell] = useState<{ 
    empId: string; 
    empName: string; 
    day: string; 
    dateStr: string; 
    currentCode: string; 
    dept: string; 
  } | null>(null);
  
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTab, setPickerTab] = useState<'all' | 'split' | 'parttime' | 'other' | 'off'>('all');

  // Date numbers for the week header
  const startDate = new Date(activeSchedule.startDate);
  const dateNumbers = daysOfWeek.map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.getDate();
  });

  // Get shift code for an employee on a given day
  const getShift = (empId: string, day: string): string => {
    const assignment = activeSchedule.assignments[day]?.find(a => a.employeeId === empId);
    return assignment?.shiftCode || '';
  };

  // Check if shift overlaps target slot
  const isShiftOverlappingSlot = (sc: string, targetStart: string, targetEnd: string): boolean => {
    const shift = shiftCodes.find(s => s.code === sc);
    if (!shift || shift.type !== 'work') return false;

    const parseTimeToMinutes = (t: string): number => {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
      return parts[0] * 60 + parts[1];
    };

    const targetStartMin = parseTimeToMinutes(targetStart);
    const targetEndMin = parseTimeToMinutes(targetEnd);

    const checkOverlap = (startStr: string | null, endStr: string | null) => {
      if (!startStr || !endStr) return false;
      const startMin = parseTimeToMinutes(startStr);
      let endMin = parseTimeToMinutes(endStr);

      // Handle overnight shift wrapping
      if (endMin < startMin) {
        endMin += 24 * 60;
      }

      // Check overlap: max of starts < min of ends
      return Math.max(startMin, targetStartMin) < Math.min(endMin, targetEndMin);
    };

    // Check Period 1
    if (checkOverlap(shift.startTime || null, shift.endTime || null)) return true;

    // Check Period 2 (split shifts)
    if (shift.isSplit && checkOverlap(shift.startTime2 || null, shift.endTime2 || null)) return true;

    return false;
  };

  // Count working employees (non-leave, non-off, non-empty) per day for a group
  const countWorkingTotal = (group: string, day: string): number => {
    const groupEmps = employees.filter(e => e.scheduleGroup === group);
    return groupEmps.reduce((count, emp) => {
      const sc = getShift(emp.id, day);
      if (!sc || sc === 'NPL' || sc === 'OFF' || sc === 'R' || sc === 'TS') return count;
      return count + 1;
    }, 0);
  };

  const countWorkingPeriod = (group: string, day: string, period: 'AM' | 'PM'): number => {
    const groupEmps = employees.filter(e => e.scheduleGroup === group);
    return groupEmps.reduce((count, emp) => {
      const sc = getShift(emp.id, day);
      if (!sc || sc === 'NPL' || sc === 'OFF' || sc === 'R' || sc === 'TS') return count;
      const shift = shiftCodes.find(s => s.code === sc);
      if (!shift) return count;
      
      const isAM = (shift.startTime && shift.startTime < "14:00") || (shift.startTime2 && shift.startTime2 < "14:00");
      const isPM = (shift.endTime && shift.endTime > "14:00") || (shift.endTime2 && shift.endTime2 > "14:00");
      
      if (period === 'AM' && isAM) return count + 1;
      if (period === 'PM' && isPM) return count + 1;
      return count;
    }, 0);
  };

  // Excel-style cell styling depending on shift codes
  const getCellBgClass = (code: string): string => {
    if (!code) return 'bg-white text-zinc-900';
    if (code === 'NPL' || code === 'TS') return 'bg-rose-50 text-rose-800 border-rose-200 font-bold'; 
    if (code === 'OFF' || code === 'R') return 'bg-white text-zinc-400';
    if (code.startsWith('KF')) return 'bg-[#ddebf7] text-[#1f4e79] font-bold'; 
    if (code.startsWith('S')) return 'bg-violet-50 text-violet-800 border-violet-200 font-bold'; 
    return 'bg-amber-50 text-amber-800 border-amber-200 font-medium'; 
  };

  // Variance styling helper
  const getVarianceStyle = (diff: number): string => {
    if (diff === 0) return 'bg-[#e2f0d9] text-[#385723] font-bold'; // soft green
    if (diff < 0) return 'bg-[#fce4d6] text-[#c00000] font-bold'; // soft red
    return 'bg-[#fff2cc] text-[#7f6000] font-bold'; // soft orange
  };

  // Update target manual input
  const handleTargetChange = (group: string, day: string, value: number) => {
    const newForecast = { ...activeSchedule.forecast };
    if (!newForecast[day]) {
      newForecast[day] = {};
    }
    newForecast[day][group] = value;
    void updateForecast(currentWeekId, newForecast);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const aoa: unknown[][] = [];
    const merges: XLSX.Range[] = [];

    // Title row
    aoa.push([`LỊCH LÀM VIỆC NHÀ HÀNG GOGI HOUSE LÊ VĂN LƯƠNG`]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });
    
    // Subtitle row
    const match = activeSchedule.weekId.match(/W(\d+)/);
    const weekNum = match ? match[1] : activeSchedule.weekId;
    
    const formatDateStr = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    aoa.push([`Tuần ${weekNum} (${formatDateStr(activeSchedule.startDate)} - ${formatDateStr(activeSchedule.endDate)})`]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });
    
    // Blank row
    aoa.push([]);

    // Loop through each group
    scheduleGroupOrder.forEach((group) => {
      const groupEmployees = employees.filter(e => e.scheduleGroup === group);
      if (groupEmployees.length === 0) return;

      // Header row for the group
      const headers = [
        'STT', 
        'CODE', 
        group, 
        'LEVEL', 
        ...daysOfWeek.map((day, i) => `${day.toUpperCase()} (${dateNumbers[i]})`), 
        'SĐT'
      ];
      aoa.push(headers);

      // Employee rows
      groupEmployees.forEach((emp, idx) => {
        const row = [
          idx + 1,
          emp.level === 'HUB' || emp.id.startsWith('HUB_') ? '-' : emp.id,
          emp.name,
          emp.level,
          ...daysOfWeek.map(day => getShift(emp.id, day)),
          emp.phone || '-'
        ];
        aoa.push(row);
      });

      // 1. Định biên dự trù row
      const forecastRowIdx = aoa.length;
      const forecastRow = [
        'Định biên dự trù (Nhập tay)',
        '',
        '',
        'Cần',
        ...daysOfWeek.map(day => activeSchedule.forecast[day]?.[group] ?? 0),
        ''
      ];
      aoa.push(forecastRow);
      merges.push({ s: { r: forecastRowIdx, c: 0 }, e: { r: forecastRowIdx, c: 2 } });

      // 2. Đã xếp thực tế row
      const actualRowIdx = aoa.length;
      const actualRow = [
        'Đã xếp thực tế (Tổng)',
        '',
        '',
        'Có',
        ...daysOfWeek.map(day => countWorkingTotal(group, day)),
        ''
      ];
      aoa.push(actualRow);
      merges.push({ s: { r: actualRowIdx, c: 0 }, e: { r: actualRowIdx, c: 2 } });

      // 3. Chênh lệch row
      const diffRowIdx = aoa.length;
      const diffRow = [
        'Chênh lệch thừa/thiếu',
        '',
        '',
        '+/-',
        ...daysOfWeek.map(day => {
          const targetVal = activeSchedule.forecast[day]?.[group] ?? 0;
          const actualVal = countWorkingTotal(group, day);
          const diff = actualVal - targetVal;
          return diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Đủ';
        }),
        ''
      ];
      aoa.push(diffRow);
      merges.push({ s: { r: diffRowIdx, c: 0 }, e: { r: diffRowIdx, c: 2 } });

      // 4. AM/PM breakdown row
      const amPmRowIdx = aoa.length;
      const amPmRow = [
        'Ca sáng (AM) / Ca tối (PM)',
        '',
        '',
        'Buổi',
        ...daysOfWeek.map(day => {
          const am = countWorkingPeriod(group, day, 'AM');
          const pm = countWorkingPeriod(group, day, 'PM');
          return `AM: ${am} / PM: ${pm}`;
        }),
        ''
      ];
      aoa.push(amPmRow);
      merges.push({ s: { r: amPmRowIdx, c: 0 }, e: { r: amPmRowIdx, c: 2 } });

      // Timeline row details if group in ['ORDER + PHỤC VỤ', 'BOY', 'BOH (BẾP)', 'BAR']
      if (['ORDER + PHỤC VỤ', 'BOY', 'BOH (BẾP)', 'BAR'].includes(group)) {
        const slots = [
          { label: '8H-11H', start: '08:00', end: '11:00' },
          { label: '11H-14H', start: '11:00', end: '14:00' },
          { label: '14H30-17H', start: '14:30', end: '17:00' },
          { label: '17H-22H', start: '17:00', end: '22:00' },
          { label: '22H-23H', start: '22:00', end: '23:00' },
        ];

        const startTimelineRowIdx = aoa.length;
        slots.forEach((slot, slotIdx) => {
          const slotRow = [
            slotIdx === 0 ? 'TIME LINE CHI TIẾT' : '',
            '',
            '',
            slot.label,
            ...daysOfWeek.map(day => {
              return employees.filter(e => e.scheduleGroup === group).filter(emp => {
                const sc = getShift(emp.id, day);
                return isShiftOverlappingSlot(sc, slot.start, slot.end);
              }).length;
            }),
            ''
          ];
          aoa.push(slotRow);
        });
        merges.push({ s: { r: startTimelineRowIdx, c: 0 }, e: { r: startTimelineRowIdx + 4, c: 2 } });
      }

      // Blank row separator
      aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 10 }, // CODE
      { wch: 25 }, // Employee Name / Group Name
      { wch: 8 },  // LEVEL
      { wch: 12 }, // Thứ 2
      { wch: 12 }, // Thứ 3
      { wch: 12 }, // Thứ 4
      { wch: 12 }, // Thứ 5
      { wch: 12 }, // Thứ 6
      { wch: 12 }, // Thứ 7
      { wch: 12 }, // Chủ Nhật
      { wch: 15 }  // SĐT
    ];

    // Format cells with styles using xlsx-js-style
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const col0Cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      const col0Val = col0Cell ? col0Cell.v : '';

      const col3Cell = ws[XLSX.utils.encode_cell({ r, c: 3 })];
      const col3Val = col3Cell ? col3Cell.v : '';
      
      const isTimelineRow = col0Val === 'TIME LINE CHI TIẾT' || 
        (['8H-11H', '11H-14H', '14H30-17H', '17H-22H', '22H-23H'].includes(String(col3Val)) && col0Val === '');

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell) continue;

        // Default cell style
        const style: XLSX.CellStyle = {
          font: { name: 'Arial', sz: 9 },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'D9D9D9' } },
            bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
            left: { style: 'thin', color: { rgb: 'D9D9D9' } },
            right: { style: 'thin', color: { rgb: 'D9D9D9' } }
          }
        };

        if (r === 0) {
          // Title
          style.font = { name: 'Arial', sz: 14, bold: true, color: { rgb: '000000' } };
          style.fill = { fgColor: { rgb: 'FCE4D6' } };
          style.alignment = { vertical: 'center', horizontal: 'center' };
        } else if (r === 1) {
          // Subtitle
          style.font = { name: 'Arial', sz: 10, italic: true, color: { rgb: '595959' } };
          style.fill = { fgColor: { rgb: 'FCE4D6' } };
          style.alignment = { vertical: 'center', horizontal: 'center' };
        } else if (col0Val === 'STT') {
          // Group Header Row
          style.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' } };
          style.fill = { fgColor: { rgb: 'F4B084' } };
          if (c === 2) {
            style.alignment = { vertical: 'center', horizontal: 'left' };
          } else {
            style.alignment = { vertical: 'center', horizontal: 'center' };
          }
          style.border = {
            top: { style: 'medium', color: { rgb: '7F7F7F' } },
            bottom: { style: 'medium', color: { rgb: '7F7F7F' } },
            left: { style: 'thin', color: { rgb: '7F7F7F' } },
            right: { style: 'thin', color: { rgb: '7F7F7F' } }
          };
        } else if (col0Val === 'Định biên dự trù (Nhập tay)') {
          // Forecast Row
          style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '7F6000' } };
          style.fill = { fgColor: { rgb: 'FFF2CC' } };
          style.border = {
            top: { style: 'medium', color: { rgb: '7F7F7F' } },
            bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
            left: { style: 'thin', color: { rgb: 'D9D9D9' } },
            right: { style: 'thin', color: { rgb: 'D9D9D9' } }
          };
        } else if (col0Val === 'Đã xếp thực tế (Tổng)') {
          // Actual Row
          style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '1F4E79' } };
          style.fill = { fgColor: { rgb: 'F2F2F2' } };
        } else if (col0Val === 'Chênh lệch thừa/thiếu') {
          // Variance Row
          style.font = { name: 'Arial', sz: 9, bold: true };
          style.fill = { fgColor: { rgb: 'F2F2F2' } };
          
          if (c >= 4 && c <= 10) {
            const val = String(cell.v);
            if (val === 'Đủ') {
              style.fill = { fgColor: { rgb: 'E2F0D9' } };
              style.font.color = { rgb: '385723' };
            } else if (val.startsWith('-')) {
              style.fill = { fgColor: { rgb: 'FCE4D6' } };
              style.font.color = { rgb: 'C00000' };
            } else if (val.startsWith('+')) {
              style.fill = { fgColor: { rgb: 'FFF2CC' } };
              style.font.color = { rgb: '7F6000' };
            }
          }
        } else if (col0Val === 'Ca sáng (AM) / Ca tối (PM)') {
          // AM/PM row
          style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '333333' } };
          style.fill = { fgColor: { rgb: 'FCE4D6' } };
        } else if (isTimelineRow) {
          // Timeline Row
          style.font = { name: 'Arial', sz: 8.5, color: { rgb: '595959' } };
          if (c === 0) {
            style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '595959' } };
            style.fill = { fgColor: { rgb: 'F2F2F2' } };
          } else if (c === 3) {
            style.font.bold = true;
            style.fill = { fgColor: { rgb: 'F9F9F9' } };
          }
        } else if (typeof col0Val === 'number' || (!isNaN(Number(col0Val)) && col0Val !== '')) {
          // Employee Row
          if (c === 2) {
            // Name cell
            style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '333333' } };
            style.alignment = { vertical: 'center', horizontal: 'left' };
            style.fill = { fgColor: { rgb: 'F9F9F9' } };
          } else if (c === 0 || c === 1 || c === 3 || c === 11) {
            // STT, CODE, LEVEL, Phone
            style.font = { name: 'Arial', sz: 9, color: { rgb: '595959' } };
            style.fill = { fgColor: { rgb: 'F9F9F9' } };
            if (c === 1 || c === 11) style.font.name = 'Courier New';
          } else if (c >= 4 && c <= 10) {
            // Shifts
            const shiftVal = String(cell.v).trim();
            if (shiftVal === 'NPL' || shiftVal === 'TS') {
              style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: 'C00000' } };
              style.fill = { fgColor: { rgb: 'FCE4D6' } };
            } else if (shiftVal === 'OFF' || shiftVal === 'R') {
              style.font = { name: 'Arial', sz: 9, color: { rgb: 'BFBFBF' } };
              style.fill = { fgColor: { rgb: 'FFFFFF' } };
            } else if (shiftVal.startsWith('KF')) {
              style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '1F4E79' } };
              style.fill = { fgColor: { rgb: 'DDEBF7' } };
            } else if (shiftVal.startsWith('S')) {
              style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '7030A0' } };
              style.fill = { fgColor: { rgb: 'F2E8FD' } };
            } else if (shiftVal !== '') {
              style.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: '7F6000' } };
              style.fill = { fgColor: { rgb: 'FFF2CC' } };
            }
          }
        }
        
        cell.s = style;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, `Lich Tuần ${weekNum}`);
    XLSX.writeFile(wb, `Lich_Roster_Tuan_${weekNum}.xlsx`);
    showToast(`Đã xuất file Excel ca làm việc Tuần ${weekNum} thành công!`, 'success');
  };

  return (
    <div className="space-y-4 bg-zinc-50 p-1 rounded-lg">
      
      {/* 1. Sheet Header Banner */}
      <div className="bg-[#fce4d6] border-2 border-zinc-400 text-zinc-900 flex items-center justify-between py-2 px-4 rounded-md">
        <div className="w-24 hidden md:block"></div> {/* Spacer for symmetry */}
        <h2 className="text-sm md:text-base font-extrabold tracking-wide uppercase m-0 font-sans text-zinc-950 flex-1 text-center">
          LỊCH LÀM VIỆC NHÀ HÀNG GOGI HOUSE LÊ VĂN LƯƠNG
        </h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg border border-emerald-500 shadow-sm cursor-pointer no-print transition-all"
        >
          <FileXls size={16} weight="bold" />
          Xuất Excel
        </button>
      </div>

      {/* 2. Schedule table per department group */}
      {scheduleGroupOrder.map((group) => {
        const groupEmployees = employees.filter(e => e.scheduleGroup === group);
        if (groupEmployees.length === 0) return null;

        return (
          <div key={group} className="border border-zinc-400 overflow-x-auto shadow-sm bg-white rounded-sm">
            <table className="w-full border-collapse text-[11px] font-sans table-fixed select-none">
              
              {/* Group header row */}
              <thead>
                <tr className="bg-[#f4b084] text-zinc-950 font-bold">
                  <th className="border border-zinc-400 px-1 py-1.5 text-center w-9 font-bold">STT</th>
                  <th className="border border-zinc-400 px-1 py-1.5 text-center w-18 font-bold">CODE</th>
                  <th className="border border-zinc-400 px-2 py-1.5 text-left w-44 font-extrabold uppercase">{group}</th>
                  <th className="border border-zinc-400 px-1 py-1.5 text-center w-14 font-bold">LEVEL</th>
                  {daysOfWeek.map((day, i) => (
                    <th key={day} className="border border-zinc-400 px-1 py-1 text-center w-20">
                      <div className="font-bold text-[10px] text-zinc-900">{day.toUpperCase()}</div>
                      <div className="font-extrabold text-sm text-[#c00000]">{dateNumbers[i]}</div>
                    </th>
                  ))}
                  <th className="border border-zinc-400 px-1 py-1.5 text-center w-28 font-bold">SĐT</th>
                </tr>
              </thead>
              
              <tbody>
                {/* Employee rows */}
                {groupEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="border border-zinc-300 px-1 py-1 text-center text-zinc-500 font-mono bg-zinc-50">{idx + 1}</td>
                    <td 
                      onClick={() => {
                        const idText = emp.level === 'HUB' || emp.id.startsWith('HUB_') ? '' : emp.id;
                        if (idText) triggerCopy(idText, 'Mã nhân viên');
                      }}
                      title="Click để copy Mã nhân viên"
                      className="border border-zinc-300 px-1 py-1 text-center font-mono text-zinc-900 text-[11px] font-bold bg-zinc-50 hover:bg-zinc-100 cursor-pointer active:bg-zinc-200 transition-colors"
                      style={{ userSelect: 'text' }}
                    >
                      {emp.level === 'HUB' || emp.id.startsWith('HUB_') ? '-' : emp.id}
                    </td>
                    <td className="border border-zinc-300 px-2 py-1 text-left font-semibold text-zinc-800 whitespace-nowrap overflow-hidden text-ellipsis bg-zinc-50">{emp.name}</td>
                    <td className="border border-zinc-300 px-1 py-1 text-center text-zinc-600 font-mono text-[10px] bg-zinc-50">{emp.level}</td>
                    
                    {daysOfWeek.map((day) => {
                      const sc = getShift(emp.id, day);
                      const shiftDetail = shiftCodes.find(s => s.code === sc);
                      const titleText = shiftDetail 
                        ? shiftDetail.isSplit 
                          ? `${shiftDetail.code}: ${shiftDetail.startTime}-${shiftDetail.endTime} & ${shiftDetail.startTime2}-${shiftDetail.endTime2}`
                          : `${shiftDetail.code}: ${shiftDetail.startTime}-${shiftDetail.endTime}`
                        : '';

                      return (
                        <td
                          key={day}
                          title={titleText}
                          className={`border border-zinc-300 px-0.5 py-0.5 text-center cursor-pointer transition-colors relative h-8 ${getCellBgClass(sc)} hover:opacity-90`}
                          onClick={() => {
                            if (isEditable) {
                              setPickerCell({
                                empId: emp.id,
                                empName: emp.name,
                                day,
                                dateStr: `${day} (Ngày ${dateNumbers[daysOfWeek.indexOf(day)]})`,
                                currentCode: sc,
                                dept: emp.primaryDepartment
                              });
                              setPickerSearch('');
                              setPickerTab('all');
                            }
                          }}
                        >
                          <span className="block font-bold">{sc || ''}</span>
                        </td>
                      );
                    })}
                    <td 
                      onClick={() => {
                        if (emp.phone) triggerCopy(emp.phone, 'Số điện thoại');
                      }}
                      title="Click để copy Số điện thoại"
                      className="border border-zinc-300 px-1 py-1 text-center text-zinc-900 font-mono text-[11px] font-bold bg-zinc-50 hover:bg-zinc-100 cursor-pointer active:bg-zinc-200 transition-colors"
                      style={{ userSelect: 'text' }}
                    >
                      {emp.phone || '-'}
                    </td>
                  </tr>
                ))}

                {/* 1. ROW: Định biên dự trù (Manual input for Manager) */}
                <tr className="bg-[#fff2cc] font-bold text-zinc-900 border-t-2 border-zinc-400">
                  <td className="border border-zinc-400 px-2 py-1 text-left" colSpan={3}>
                    <span className="text-[#7f6000] font-extrabold text-[10px] uppercase">
                      Định biên dự trù (Nhập tay)
                    </span>
                  </td>
                  <td className="border border-zinc-400 px-1 py-1 text-center font-bold text-[10px] text-zinc-600 bg-zinc-100">Cần</td>
                  {daysOfWeek.map((day) => {
                    const targetVal = activeSchedule.forecast[day]?.[group] ?? 0;
                    return (
                      <td key={day} className="border border-zinc-400 px-1 py-1 text-center bg-white">
                        <input
                          type="number"
                          min="0"
                          value={targetVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleTargetChange(group, day, isNaN(val) ? 0 : val);
                          }}
                          disabled={!isEditable}
                          className="w-full bg-transparent text-center text-[11px] font-extrabold text-zinc-900 border-none outline-none focus:ring-1 focus:ring-amber-500 rounded p-0"
                        />
                      </td>
                    );
                  })}
                  <td className="border border-zinc-400 bg-zinc-50"></td>
                </tr>

                {/* 2. ROW: Đã xếp thực tế (Calculated) */}
                <tr className="bg-[#f2f2f2] font-bold text-zinc-900">
                  <td className="border border-zinc-400 px-2 py-1 text-left" colSpan={3}>
                    <span className="text-zinc-700 font-extrabold text-[10px] uppercase">
                      Đã xếp thực tế (Tổng)
                    </span>
                  </td>
                  <td className="border border-zinc-400 px-1 py-1 text-center font-bold text-[10px] text-zinc-600 bg-zinc-100">Có</td>
                  {daysOfWeek.map((day) => {
                    const actualVal = countWorkingTotal(group, day);
                    return (
                      <td key={day} className="border border-zinc-400 px-1 py-1 text-center text-[#1f4e79] font-extrabold text-xs">
                        {actualVal}
                      </td>
                    );
                  })}
                  <td className="border border-zinc-400 bg-zinc-50"></td>
                </tr>

                {/* 3. ROW: Chênh lệch nhân lực */}
                <tr className="font-bold text-zinc-900">
                  <td className="border border-zinc-400 px-2 py-1 text-left bg-zinc-100" colSpan={3}>
                    <span className="text-zinc-800 font-extrabold text-[10px] uppercase">
                      Chênh lệch thừa/thiếu
                    </span>
                  </td>
                  <td className="border border-zinc-400 px-1 py-1 text-center font-bold text-[10px] text-zinc-600 bg-zinc-100">+/-</td>
                  {daysOfWeek.map((day) => {
                    const targetVal = activeSchedule.forecast[day]?.[group] ?? 0;
                    const actualVal = countWorkingTotal(group, day);
                    const diff = actualVal - targetVal;
                    const sign = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Đủ';
                    return (
                      <td key={day} className={`border border-zinc-400 px-1 py-1 text-center text-xs ${getVarianceStyle(diff)}`}>
                        {sign}
                      </td>
                    );
                  })}
                  <td className="border border-zinc-400 bg-zinc-50"></td>
                </tr>

                {/* 4. ROW: AM/PM Breakdown */}
                <tr className="bg-[#fce4d6] font-bold text-zinc-900">
                  <td className="border border-zinc-400 px-2 py-1 text-left" colSpan={3}>
                    <span className="text-[#c00000] font-extrabold text-[10px] uppercase">
                      Ca sáng (AM) / Ca tối (PM)
                    </span>
                  </td>
                  <td className="border border-zinc-400 px-1 py-1 text-center font-bold text-[10px] text-zinc-600 bg-zinc-100">Buổi</td>
                  {daysOfWeek.map((day) => {
                    const am = countWorkingPeriod(group, day, 'AM');
                    const pm = countWorkingPeriod(group, day, 'PM');
                    return (
                      <td key={day} className="border border-zinc-400 px-1 py-1 text-center text-zinc-800">
                        <div className="text-[#1f4e79] text-[10px]">AM: {am}</div>
                        <div className="text-[#c00000] text-[10px]">PM: {pm}</div>
                      </td>
                    );
                  })}
                  <td className="border border-zinc-400 bg-zinc-50"></td>
                </tr>

                {/* Optional Timeline Row for Shift Headcount details as seen in Excel */}
                {['ORDER + PHỤC VỤ', 'BOY', 'BOH (BẾP)', 'BAR'].includes(group) && (
                  <>
                    <tr className="bg-white text-zinc-700 text-[10px] border-t border-zinc-300">
                      <td className="border border-zinc-300 px-2 py-0.5 text-center font-semibold bg-zinc-50" colSpan={3} rowSpan={5}>
                        TIME LINE CHI TIẾT
                      </td>
                      <td className="border border-zinc-300 px-1 py-0.5 text-center font-mono bg-zinc-50">8H-11H</td>
                      {daysOfWeek.map((day) => {
                        const count = employees.filter(e => e.scheduleGroup === group).filter(emp => {
                          const sc = getShift(emp.id, day);
                          return isShiftOverlappingSlot(sc, "08:00", "11:00");
                        }).length;
                        return (
                          <td key={day} className="border border-zinc-300 px-1 py-0.5 text-center font-semibold text-zinc-600">
                            {count}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-300 bg-zinc-50"></td>
                    </tr>
                    <tr className="bg-white text-zinc-700 text-[10px]">
                      <td className="border border-zinc-300 px-1 py-0.5 text-center font-mono bg-zinc-50">11H-14H</td>
                      {daysOfWeek.map((day) => {
                        const count = employees.filter(e => e.scheduleGroup === group).filter(emp => {
                          const sc = getShift(emp.id, day);
                          return isShiftOverlappingSlot(sc, "11:00", "14:00");
                        }).length;
                        return (
                          <td key={day} className="border border-zinc-300 px-1 py-0.5 text-center font-semibold text-zinc-600">
                            {count}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-300 bg-zinc-50"></td>
                    </tr>
                    <tr className="bg-white text-zinc-700 text-[10px]">
                      <td className="border border-zinc-300 px-1 py-0.5 text-center font-mono bg-zinc-50">14H30-17H</td>
                      {daysOfWeek.map((day) => {
                        const count = employees.filter(e => e.scheduleGroup === group).filter(emp => {
                          const sc = getShift(emp.id, day);
                          return isShiftOverlappingSlot(sc, "14:30", "17:00");
                        }).length;
                        return (
                          <td key={day} className="border border-zinc-300 px-1 py-0.5 text-center font-semibold text-zinc-600">
                            {count}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-300 bg-zinc-50"></td>
                    </tr>
                    <tr className="bg-white text-zinc-700 text-[10px]">
                      <td className="border border-zinc-300 px-1 py-0.5 text-center font-mono bg-zinc-50">17H-22H</td>
                      {daysOfWeek.map((day) => {
                        const count = employees.filter(e => e.scheduleGroup === group).filter(emp => {
                          const sc = getShift(emp.id, day);
                          return isShiftOverlappingSlot(sc, "17:00", "22:00");
                        }).length;
                        return (
                          <td key={day} className="border border-zinc-300 px-1 py-0.5 text-center font-semibold text-zinc-600">
                            {count}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-300 bg-zinc-50"></td>
                    </tr>
                    <tr className="bg-white text-zinc-700 text-[10px]">
                      <td className="border border-zinc-300 px-1 py-0.5 text-center font-mono bg-zinc-50">22H-23H</td>
                      {daysOfWeek.map((day) => {
                        const count = employees.filter(e => e.scheduleGroup === group).filter(emp => {
                          const sc = getShift(emp.id, day);
                          return isShiftOverlappingSlot(sc, "22:00", "23:00");
                        }).length;
                        return (
                          <td key={day} className="border border-zinc-300 px-1 py-0.5 text-center font-semibold text-zinc-600">
                            {count}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-300 bg-zinc-50"></td>
                    </tr>
                  </>
                )}

              </tbody>
            </table>
          </div>
        );
      })}

      {/* Quick Legend & Info */}
      <div className="bg-white border border-zinc-200 rounded p-2 text-[10px] text-zinc-600 flex flex-wrap gap-4 justify-between shadow-sm">
        <div className="space-y-1">
          <div>
            <span className="font-extrabold text-zinc-900 mr-2">Hướng dẫn phân ca:</span>
            <span>Click trực tiếp vào ô lịch của bất cứ nhân viên nào để chọn hoặc thay đổi mã ca.</span>
          </div>
          <div>
            <span className="font-extrabold text-zinc-900 mr-2">Hướng dẫn định biên:</span>
            <span>Quản lý có thể nhập số lượng nhân viên dự trù cần thiết vào dòng <span className="font-bold text-[#7f6000] bg-[#fff2cc] px-1 rounded">Định biên dự trù (Nhập tay)</span> để xem chênh lệch thừa/thiếu.</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#ddebf7] border border-zinc-300"></span> Ca sáng/RM</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#fce4d6] border border-zinc-300"></span> Nghỉ/Ca admin/S20</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#fff2cc] border border-zinc-300"></span> Ca tối/part-time</span>
        </div>
      </div>

      {/* Popover Shift Picker Modal */}
      {pickerCell && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-zinc-800 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 uppercase">
                  Xếp ca làm việc
                </h4>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                  Nhân viên: <span className="font-bold text-zinc-700">{pickerCell.empName}</span> | {pickerCell.dateStr}
                </p>
              </div>
              <button 
                onClick={() => setPickerCell(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Quick Actions / Shortcuts */}
            <div className="space-y-1.5 flex-shrink-0">
              <span className="block text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">Chọn nhanh</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: '', name: 'Bỏ xếp ca', color: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300' },
                  { code: 'R', name: 'Nghỉ tuần R', color: 'bg-zinc-50 hover:bg-zinc-100 text-zinc-450 border-zinc-200' },
                  { code: 'OFF', name: 'Nghỉ OFF', color: 'bg-zinc-50 hover:bg-zinc-100 text-zinc-450 border-zinc-200' },
                  { code: 'NPL', name: 'Nghỉ phép', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' },
                  { code: 'KF1', name: 'KF Sáng (08:00)', color: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 font-bold' },
                  { code: 'KF3', name: 'KF Tối (15:00)', color: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 font-bold' },
                  { code: 'P22', name: 'Tối P22 (17:00)', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 font-bold' },
                  { code: 'S1', name: 'Ca gãy S1 (07:30)', color: 'bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200 font-bold' },
                  { code: 'S2', name: 'Ca gãy S2 (07:30)', color: 'bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200 font-bold' },
                ].map(shortcut => (
                  <button
                    key={shortcut.code}
                    onClick={() => {
                      if (!shortcut.code) {
                        void removeAssignment(currentWeekId, pickerCell.day, pickerCell.empId);
                      } else {
                        void addAssignment(currentWeekId, pickerCell.day, {
                          employeeId: pickerCell.empId,
                          shiftCode: shortcut.code,
                          primaryRole: pickerCell.dept,
                        });
                      }
                      setPickerCell(null);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all border ${shortcut.color}`}
                  >
                    {shortcut.code || shortcut.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search */}
            <div className="space-y-2 flex-shrink-0">
              <span className="block text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">Tất cả mã ca</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm nhanh mã ca (ví dụ: S10, P45)..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500 font-mono"
                  autoFocus
                />
                <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>

              {/* Picker Tab selection */}
              <div className="flex flex-wrap gap-1">
                {([
                  { id: 'all', label: 'Tất cả' },
                  { id: 'split', label: 'Ca gãy (S)' },
                  { id: 'parttime', label: 'Ca tối (P)' },
                  { id: 'other', label: 'Ca khác' },
                  { id: 'off', label: 'Nghỉ/Phép' },
                ] satisfies Array<{
                  id: 'all' | 'split' | 'parttime' | 'other' | 'off';
                  label: string;
                }>).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPickerTab(tab.id)}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all border ${
                      pickerTab === tab.id
                        ? 'bg-[#f4b084] text-zinc-950 border-[#e29d71]'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift List Container */}
            <div className="flex-1 overflow-y-auto min-h-[150px] border border-zinc-150 rounded-lg p-1 space-y-1 bg-zinc-50">
              {(() => {
                const filtered = shiftCodes.filter(shift => {
                  const matchSearch = 
                    shift.code.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    shift.name.toLowerCase().includes(pickerSearch.toLowerCase());
                  if (!matchSearch) return false;

                  if (pickerTab === 'split') {
                    return !!shift.isSplit || shift.code.startsWith('S');
                  }
                  if (pickerTab === 'parttime') {
                    return shift.code.startsWith('P') && !shift.isSplit;
                  }
                  if (pickerTab === 'off') {
                    return ['R', 'OFF', 'TS', 'NPL', 'KP', 'N', 'AL'].includes(shift.code) || shift.type === 'off' || shift.type === 'leave';
                  }
                  if (pickerTab === 'other') {
                    const isSplit = !!shift.isSplit || shift.code.startsWith('S');
                    const isPart = shift.code.startsWith('P');
                    const isOff = ['R', 'OFF', 'TS', 'NPL', 'KP', 'N', 'AL'].includes(shift.code) || shift.type === 'off' || shift.type === 'leave';
                    return !isSplit && !isPart && !isOff;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-400 text-xs font-medium bg-zinc-50 rounded-xl border border-dashed border-zinc-250">
                      Không tìm thấy ca nào phù hợp
                    </div>
                  );
                }

                return filtered.map(shift => (
                  <button
                    key={shift.code}
                    onClick={() => {
                      void addAssignment(currentWeekId, pickerCell.day, {
                        employeeId: pickerCell.empId,
                        shiftCode: shift.code,
                        primaryRole: pickerCell.dept,
                      });
                      setPickerCell(null);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border w-12 text-center flex-shrink-0 ${
                        shift.color === 'sky' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                        shift.color === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        shift.color === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        shift.color === 'indigo' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                        shift.color === 'violet' ? 'bg-violet-50 text-violet-800 border-violet-200' :
                        shift.color === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-zinc-105 text-zinc-800 border-zinc-200'
                      }`}>
                        {shift.code}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-zinc-700 block leading-tight">{shift.name}</span>
                        <span className="text-[9px] text-zinc-400 block mt-0.5 leading-none">
                          {shift.isSplit ? (
                            <span>{shift.startTime}-{shift.endTime} &amp; {shift.startTime2}-{shift.endTime2}</span>
                          ) : (
                            <span>{shift.startTime}-{shift.endTime}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#c00000] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Chọn &rarr;</span>
                  </button>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-zinc-100 flex-shrink-0">
              <button
                onClick={() => setPickerCell(null)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-300 transition-colors"
              >
                Hủy bỏ
              </button>
            </div>

          </div>
        </div>
      )}

      {copyToast && (
        <div className="fixed bottom-4 right-4 bg-zinc-950 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-zinc-850 font-semibold animate-pulse">
          <Check size={14} className="text-emerald-500" weight="bold" />
          <span>Đã sao chép {copyToast}</span>
        </div>
      )}

    </div>
  );
}
