import { useState, useEffect, useRef } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { daysOfWeek } from './data/mockData';
import { ExcelScheduleGrid } from './components/ExcelScheduleGrid';
import type { Employee, EmployeePreference, ShiftCode, WeeklySchedule } from './data/mockData';
import { EmployeeModal } from './components/EmployeeModal';
import { ShiftModal } from './components/ShiftModal';
import { SearchableShiftSelect } from './components/SearchableShiftSelect';
import { 
  Calendar, 
  Users, 
  Clock, 
  Check, 
  Lock, 
  UserGear,
  Warning,
  Printer,
  Plus,
  Pencil,
  MagnifyingGlass,
  X
} from '@phosphor-icons/react';

function App() {
  const {
    employees,
    shiftCodes,
    schedules,
    currentWeekId,
    currentUser,
    authStatus,
    authError,
    catalogStatus,
    catalogError,
    scheduleStatus,
    scheduleError,
    initializeAuth,
    loginEmployee,
    loginManager,
    logout,
    setCurrentWeekId,
    updateScheduleStatus,
    submitPreferences,
    addEmployee,
    updateEmployee,
    updateEmployeeStatus,
    addShiftCode,
    updateShiftCode,
    updateShiftStatus,
    loadCatalogs,
    loadSchedules,
    createNextWeek,
    toasts,
    showToast,
    dismissToast
  } = useScheduleStore();

  // Path Router State & Logic
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [preferenceSubmitting, setPreferenceSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'settings'>('schedule');
  const [empScheduleTab, setEmpScheduleTab] = useState<'personal' | 'general' | 'shifts'>('personal');
  const [empShiftSearch, setEmpShiftSearch] = useState('');
  const [empShiftFilter, setEmpShiftFilter] = useState<'all' | 'FOH' | 'BOH'>('all');

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  // Authentication routing effect
  useEffect(() => {
    if (authStatus === 'loading') return;

    const expectedPath = !currentUser ? '/' : currentUser.role === 'manager' ? '/rm' : '/staff';
    if (currentPath === expectedPath || (!currentUser && currentPath === '/login')) return;

    window.history.replaceState({}, '', expectedPath);
    queueMicrotask(() => {
      setCurrentPath(expectedPath);
      if (currentUser?.role === 'employee') setActiveTab('schedule');
    });
  }, [authStatus, currentUser, currentPath]);

  // Login States
  const [loginTab, setLoginTab] = useState<'staff' | 'manager'>('staff');
  const [staffInput, setStaffInput] = useState('');
  const [managerUser, setManagerUser] = useState('');
  const [managerPass, setManagerPass] = useState('');

  // 3D Perspective Tilt State & Handlers for Login Box
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.querySelector('.login-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cardX = rect.left + rect.width / 2;
    const cardY = rect.top + rect.height / 2;
    const angleX = -(e.clientY - cardY) / 20; // adjust responsiveness
    const angleY = (e.clientX - cardX) / 20;
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`,
      transition: 'none'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.5s ease'
    });
  };

  // Interactive Particle canvas loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (currentUser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const colors = ['rgba(244, 176, 132, ', 'rgba(192, 0, 0, ', 'rgba(245, 158, 11, '];

    const createParticle = (x?: number, y?: number): Particle => {
      return {
        x: x ?? Math.random() * width,
        y: y ?? height + 10,
        size: Math.random() * 5 + 2,
        speedX: Math.random() * 1.2 - 0.6,
        speedY: -(Math.random() * 1.2 + 0.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.4 + 0.2,
        decay: Math.random() * 0.002 + 0.001
      };
    };

    // Seed initial particles
    for (let i = 0; i < 35; i++) {
      particles.push(createParticle(Math.random() * width, Math.random() * height));
    }

    const mouse = { x: -1000, y: -1000 };
    const handleCanvasMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleCanvasMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        // Interactive gravity repel from mouse cursor
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          const force = (130 - dist) / 130;
          p.x -= (dx / dist) * force * 3;
          p.y -= (dy / dist) * force * 3;
        }

        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y < -10 || p.x < -10 || p.x > width + 10) {
          particles[i] = createParticle();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color + p.alpha + ')';
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [currentUser]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = staffInput.trim();
    if (!cleanInput) {
      showToast('Vui lòng nhập Mã nhân viên hoặc Số điện thoại!', 'warning');
      return;
    }

    setLoginSubmitting(true);
    const loggedIn = await loginEmployee(cleanInput);
    setLoginSubmitting(false);
    if (loggedIn) {
      setStaffInput('');
      navigateTo('/staff');
    }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoginSubmitting(true);
    const loggedIn = await loginManager(managerUser.trim(), managerPass);
    setLoginSubmitting(false);
    if (loggedIn) {
      setManagerPass('');
      navigateTo('/rm');
    }
  };

  // Custom Employee State for availability registration form
  const [tempPrefs, setTempPrefs] = useState<{
    [day: string]: { type: 'available' | 'preferred' | 'unavailable'; preferredShift: string; note: string };
  }>(() => {
    const initial: Record<
      string,
      {
        type: 'available' | 'preferred' | 'unavailable';
        preferredShift: string;
        note: string;
      }
    > = {};
    daysOfWeek.forEach(d => {
      initial[d] = { type: 'available', preferredShift: 'P22', note: '' };
    });
    return initial;
  });

  // Employee CRUD Form Modal States
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [empFormMode, setEmpFormMode] = useState<'add' | 'edit'>('add');
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<Employee>({
    id: '',
    name: '',
    phone: '',
    role: 'employee',
    level: 'NEW',
    scheduleGroup: 'ORDER + PHỤC VỤ',
    primaryDepartment: 'FOH',
    skills: {},
    note: '',
    status: 'active'
  });

  // Shift CRUD Form Modal States
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFormMode, setShiftFormMode] = useState<'add' | 'edit'>('add');
  const [shiftForm, setShiftForm] = useState<ShiftCode>({
    code: '',
    name: '',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    type: 'work',
    color: 'sky',
    startTime2: '',
    endTime2: '',
    isSplit: false,
    applicableDepartments: [],
    status: 'active'
  });

  // Shift List Search & Filter States
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftFilterTab, setShiftFilterTab] = useState<'all' | 'split' | 'parttime' | 'other' | 'off'>('all');

  // Employee List Search & Filter States
  const [empSearch, setEmpSearch] = useState('');
  const [empLevelFilter, setEmpLevelFilter] = useState<'all' | 'S1' | 'S2' | 'S3' | 'HUB' | 'NEW' | 'BQL'>('all');
  const [empGroupFilter, setEmpGroupFilter] = useState('all');
  const [empSkillFilter, setEmpSkillFilter] = useState('all');

  const emptyDayAssignments = Object.fromEntries(daysOfWeek.map((day) => [day, []])) as WeeklySchedule['assignments'];
  const emptyForecast = Object.fromEntries(daysOfWeek.map((day) => [day, {}])) as WeeklySchedule['forecast'];
  const emptySchedule: WeeklySchedule = {
    weekId: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    version: 0,
    assignments: emptyDayAssignments,
    preferences: [],
    forecast: emptyForecast,
  };
  const activeSchedule = schedules.find(s => s.weekId === currentWeekId) || schedules[0] || emptySchedule;
  const hasSchedules = schedules.length > 0;
  const isManager = currentUser?.role === 'manager';
  const defaultPreferredShift =
    shiftCodes.find((shift) => shift.type === 'work' && shift.status !== 'inactive')?.code ?? 'P22';
  const registrationDeadlineText = activeSchedule.registrationDeadline
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(activeSchedule.registrationDeadline))
    : 'Thứ Năm hàng tuần';

  useEffect(() => {
    if (!currentUser || !hasSchedules || currentUser.role !== 'employee') return;

    const savedPreference = activeSchedule.preferences.find(
      (preference) => preference.employeeId === currentUser.id,
    );
    const nextPrefs: Record<
      string,
      {
        type: 'available' | 'preferred' | 'unavailable';
        preferredShift: string;
        note: string;
      }
    > = {};

    daysOfWeek.forEach((day) => {
      const savedDay = savedPreference?.dayPreferences[day];
      nextPrefs[day] = {
        type: savedDay?.type ?? 'available',
        preferredShift: savedDay?.preferredShift ?? defaultPreferredShift,
        note: savedDay?.note ?? '',
      };
    });

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setTempPrefs(nextPrefs);
    });
    return () => {
      cancelled = true;
    };
  }, [
    activeSchedule.preferences,
    activeSchedule.weekId,
    currentUser,
    defaultPreferredShift,
    hasSchedules,
  ]);
  
  const getShiftColor = (code: string) => {
    const shift = shiftCodes.find(s => s.code === code);
    if (!shift) return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    switch (shift.color) {
      case 'amber': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'emerald': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'sky': return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'violet': return 'bg-violet-50 text-violet-800 border-violet-200';
      case 'rose': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Chưa mở đăng ký';
      case 'registration_open': return 'Đang mở đăng ký';
      case 'registration_locked': return 'Đã khóa đăng ký';
      case 'scheduling': return 'Đang xếp lịch';
      case 'published': return 'Đã công bố';
      default: return 'Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-zinc-100 text-zinc-700 border-zinc-300';
      case 'registration_open': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'registration_locked': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'scheduling': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'published': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };



  const handlePreferenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hasSchedules || preferenceSubmitting) return;
    
    const formattedPrefs: EmployeePreference['dayPreferences'] = {};
    const validPreferredShiftCodes = new Set(
      shiftCodes
        .filter((shift) => shift.type === 'work' && shift.status !== 'inactive')
        .map((shift) => shift.code),
    );
    let hasInvalidPreferredShift = false;

    daysOfWeek.forEach(day => {
      const dayPreference = tempPrefs[day];
      const preferredShift =
        dayPreference.type === 'preferred'
          ? dayPreference.preferredShift || defaultPreferredShift
          : undefined;
      if (
        dayPreference.type === 'preferred' &&
        (!preferredShift || !validPreferredShiftCodes.has(preferredShift))
      ) {
        hasInvalidPreferredShift = true;
      }
      formattedPrefs[day] = {
        type: dayPreference.type,
        preferredShift,
        note: dayPreference.note.trim() || undefined
      };
    });

    if (hasInvalidPreferredShift) {
      showToast('Vui lòng chọn mã ca làm việc hợp lệ cho các ngày muốn ca.', 'warning');
      return;
    }

    setPreferenceSubmitting(true);
    try {
      await submitPreferences(currentWeekId, currentUser.id, formattedPrefs);
    } catch {
      // Store already shows the backend error toast.
    } finally {
      setPreferenceSubmitting(false);
    }
  };

  const handleQuickPref = (type: 'available' | 'preferred' | 'unavailable', shiftCode?: string) => {
    const updated = { ...tempPrefs };
    daysOfWeek.forEach(day => {
      updated[day] = {
        type,
        preferredShift: shiftCode || defaultPreferredShift,
        note: type === 'unavailable' ? 'Nghỉ cá nhân' : ''
      };
    });
    setTempPrefs(updated);
  };

  // Open Add Employee
  const openAddEmployee = () => {
    setEmpFormMode('add');
    setEditingEmpId(null);
    setEmpForm({
      id: '',
      name: '',
      phone: '',
      role: 'employee',
      level: 'NEW',
      scheduleGroup: 'ORDER + PHỤC VỤ',
      primaryDepartment: 'FOH',
      skills: {},
      note: '',
      status: 'active'
    });
    setEmployeeModalOpen(true);
  };

  // Open Edit Employee
  const openEditEmployee = (emp: Employee) => {
    setEmpFormMode('edit');
    setEditingEmpId(emp.id);
    setEmpForm({ ...emp });
    setEmployeeModalOpen(true);
  };

  const handleCreateNewWeek = async () => {
    const confirmCreate = window.confirm(
      hasSchedules
        ? 'Bạn có muốn khởi tạo lịch cho tuần ISO tiếp theo không?'
        : 'Chưa có lịch tuần nào. Bạn có muốn khởi tạo tuần ISO hiện tại không?'
    );
    if (confirmCreate) {
      try {
        await createNextWeek();
      } catch {
        // Store already shows API error toast.
      }
    }
  };

  const handleScheduleStatus = async (status: WeeklySchedule['status']) => {
    if (!activeSchedule.weekId) return;
    try {
      await updateScheduleStatus(activeSchedule.weekId, status);
    } catch {
      // Store already shows API error toast and refreshes stale schedules.
    }
  };

  // Save Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmp = { ...empForm };

    if (finalEmp.level === 'HUB') {
      if (empFormMode === 'add') finalEmp.id = '';
    } else {
      if (!finalEmp.id) {
        showToast('Vui lòng điền đầy đủ Mã nhân viên!', 'warning');
        return;
      }
    }

    if (!finalEmp.name) {
      showToast('Vui lòng điền Họ tên!', 'warning');
      return;
    }

    setCatalogSubmitting(true);
    try {
      if (empFormMode === 'add') {
        await addEmployee(finalEmp);
      } else {
        await updateEmployee(editingEmpId || finalEmp.id, finalEmp);
      }
      setEmployeeModalOpen(false);
    } catch {
      // Handled by store toasts
    } finally {
      setCatalogSubmitting(false);
    }
  };

  // Open Add Shift
  const openAddShift = () => {
    setShiftFormMode('add');
    setShiftForm({
      code: '',
      name: '',
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 30,
      type: 'work',
      color: 'sky',
      startTime2: '',
      endTime2: '',
      isSplit: false,
      applicableDepartments: [],
      status: 'active'
    });
    setShiftModalOpen(true);
  };

  // Open Edit Shift
  const openEditShift = (shift: ShiftCode) => {
    setShiftFormMode('edit');
    setShiftForm({ 
      ...shift,
      startTime2: shift.startTime2 || '',
      endTime2: shift.endTime2 || '',
      isSplit: shift.isSplit || false
    });
    setShiftModalOpen(true);
  };

  // Save Shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.code || !shiftForm.name) {
      showToast('Vui lòng điền Mã ca và Tên ca!', 'warning');
      return;
    }
    const cleanShift: ShiftCode = {
      ...shiftForm,
      startTime2: shiftForm.isSplit ? (shiftForm.startTime2 || null) : null,
      endTime2: shiftForm.isSplit ? (shiftForm.endTime2 || null) : null,
      isSplit: !!shiftForm.isSplit
    };
    setCatalogSubmitting(true);
    try {
      if (shiftFormMode === 'add') {
        await addShiftCode(cleanShift);
      } else {
        await updateShiftCode(cleanShift);
      }
      setShiftModalOpen(false);
    } catch {
      // Handled by store toasts
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleEmployeeStatus = async (employee: Employee) => {
    const status = employee.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${status === 'inactive' ? 'Vô hiệu hóa' : 'Kích hoạt'} ${employee.name}?`)) {
      return;
    }
    try {
      await updateEmployeeStatus(employee.id, status);
    } catch {
      // Handled by store toasts
    }
  };

  const handleShiftStatus = async (shift: ShiftCode) => {
    const status = shift.status === 'inactive' ? 'active' : 'inactive';
    if (!window.confirm(`${status === 'inactive' ? 'Vô hiệu hóa' : 'Kích hoạt'} ca ${shift.code}?`)) {
      return;
    }
    try {
      await updateShiftStatus(shift.code, status);
    } catch {
      // Handled by store toasts
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-zinc-200 border-t-[#c00000] animate-spin" />
          <p className="text-xs font-bold text-zinc-500">Đang khôi phục phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div 
        onMouseMove={handleMouseMove} 
        onMouseLeave={handleMouseLeave}
        className="min-h-screen animated-gradient-bg flex items-center justify-center p-4 font-sans relative overflow-hidden select-none"
      >
        {/* Soft Grid Background */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none z-0" 
          style={{
            backgroundImage: `radial-gradient(circle, #e4e4e7 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0'
          }}
        />

        {/* Interactive canvas particles */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

        {/* Soft Warm Radial Blobs for Premium Glass feel */}
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-[#f4b084]/20 filter blur-[100px] opacity-70 pointer-events-none animate-pulse z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-red-100/40 filter blur-[80px] opacity-60 pointer-events-none z-0" />

        {/* Light Glassmorphic Login Card with 3D perspective tilt */}
        <div 
          style={tiltStyle}
          className="login-card w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/90 rounded-3xl p-8 shadow-[0_20px_50px_rgba(244,176,132,0.18),0_4px_30px_rgba(0,0,0,0.03)] relative z-10 transition-transform duration-100"
        >
          
          {/* Logo & Title */}
          <div className="text-center mb-8 pointer-events-none select-none">
            <div className="inline-flex bg-gradient-to-br from-[#f4b084] to-[#c00000] text-white p-4 rounded-2xl font-bold items-center justify-center mb-3 shadow-[0_8px_20px_rgba(244,176,132,0.3)]">
              <Calendar size={32} weight="fill" className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 mb-0.5">GogiCalendar</h1>
            <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Hệ thống xếp lịch nội bộ nhà hàng GoGi House</p>
          </div>

          {/* Styled Pill Tab Switcher with sliding pill background */}
          <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl mb-6 border border-zinc-200/50 relative">
            <div 
              className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-zinc-200/20 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{
                transform: `translateX(${loginTab === 'staff' ? '0%' : '100%'})`
              }}
            />
            <button
              onClick={() => setLoginTab('staff')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-colors duration-300 relative z-10 cursor-pointer ${
                loginTab === 'staff' ? 'text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              NHÂN VIÊN
            </button>
            <button
              onClick={() => setLoginTab('manager')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-colors duration-300 relative z-10 cursor-pointer ${
                loginTab === 'manager' ? 'text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              QUẢN LÝ (RM)
            </button>
          </div>

          {/* Sliding Forms Wrapper */}
          <div 
            className="overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]" 
            style={{ height: loginTab === 'staff' ? '200px' : '275px' }}
          >
            <div 
              className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{
                transform: `translateX(${loginTab === 'staff' ? '0%' : '-50%'})`
              }}
            >
              {/* Tab 1: Staff Form */}
              <div className="w-1/2 pr-4 shrink-0">
                <form onSubmit={handleStaffLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider font-black">Mã nhân viên hoặc Số điện thoại</label>
                    <input
                      type="text"
                      required
                      value={staffInput}
                      onChange={(e) => setStaffInput(e.target.value)}
                      placeholder="Mã NV (ví dụ: 0198393) hoặc SĐT..."
                      className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#f4b084] focus:ring-4 focus:ring-[#f4b084]/10 transition-all font-semibold"
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">※ Không cần mật khẩu đối với tài khoản nhân viên.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-[#f4b084] to-[#e29d71] hover:from-[#e29d71] hover:to-[#f4b084] disabled:opacity-60 disabled:cursor-wait text-zinc-950 font-black text-xs tracking-wider rounded-xl shadow-[0_4px_15px_rgba(244,176,132,0.3)] hover:shadow-[0_4px_20px_rgba(244,176,132,0.5)] hover:-translate-y-0.5 transition-all duration-300 border border-[#e29d71] cursor-pointer"
                  >
                    {loginSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'VÀO HỆ THỐNG'}
                  </button>
                </form>
              </div>

              {/* Tab 2: Manager Form */}
              <div className="w-1/2 pl-4 shrink-0">
                <form onSubmit={handleManagerLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider font-black">Tài khoản Quản lý</label>
                      <input
                        type="text"
                        required
                        value={managerUser}
                        onChange={(e) => setManagerUser(e.target.value)}
                        placeholder="Tài khoản (ví dụ: rm4650)..."
                        className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#f4b084] focus:ring-4 focus:ring-[#f4b084]/10 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider font-black">Mật khẩu</label>
                      <input
                        type="password"
                        required
                        value={managerPass}
                        onChange={(e) => setManagerPass(e.target.value)}
                        placeholder="Nhập mật khẩu quản lý..."
                        className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#f4b084] focus:ring-4 focus:ring-[#f4b084]/10 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-[#f4b084] to-[#e29d71] hover:from-[#e29d71] hover:to-[#f4b084] disabled:opacity-60 disabled:cursor-wait text-zinc-950 font-black text-xs tracking-wider rounded-xl shadow-[0_4px_15px_rgba(244,176,132,0.3)] hover:shadow-[0_4px_20px_rgba(244,176,132,0.5)] hover:-translate-y-0.5 transition-all duration-300 border border-[#e29d71] cursor-pointer"
                  >
                    {loginSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {authError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {authError}
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col font-sans">
      
      {/* 1. Header Bar */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <div className="bg-[#f4b084] text-zinc-950 p-1.5 rounded-lg font-bold flex items-center justify-center">
            <Calendar size={20} weight="fill" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight m-0 text-zinc-900 leading-none">GogiCalendar</h1>
            <span className="text-[10px] text-zinc-500 font-medium">Hệ thống xếp lịch nhà hàng Gogi House</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <div className="w-6 h-6 rounded-full bg-red-100 text-red-750 flex items-center justify-center font-bold">
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <span className="text-zinc-500 font-medium block leading-none mb-0.5 text-[9px] uppercase tracking-wider">Tài khoản</span>
              <span className="text-zinc-900 font-extrabold block leading-none">{currentUser?.name} <span className="text-zinc-500 font-medium">({currentUser?.level})</span></span>
            </div>
          </div>

          <button
            onClick={() => {
              void logout().finally(() => {
                navigateTo('/');
              });
            }}
            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        {isManager && (
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-zinc-200 bg-white p-4 shrink-0 flex md:flex-col justify-between gap-4 shadow-sm no-print">
            <div className="flex md:flex-col w-full gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'schedule' 
                    ? 'bg-[#f4b084] text-zinc-950 shadow-sm border border-[#e29d71]' 
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Calendar size={18} />
                <span>Lịch làm việc tuần</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-[#f4b084] text-zinc-950 shadow-sm border border-[#e29d71]' 
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <UserGear size={18} />
                <span>Nhân sự & Thiết lập</span>
              </button>
            </div>

            <div className="hidden md:block border-t border-zinc-100 pt-4">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Thông tin Chi Nhánh</div>
              <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="font-extrabold text-zinc-800 text-[11px]">GoGi House Lê Văn Lương</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">30 Lê Văn Lương, Hà Nội</div>
              </div>
            </div>
          </aside>
        )}

        {/* Workspace Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          
          {/* 2. Top Tool Bar: Week & Status Selection */}
          <div className="mb-6 bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm no-print">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold mb-1">Chọn Tuần Xem</label>
                <div className="flex items-center flex-wrap gap-2">
                  {scheduleStatus === 'loading' && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Đang tải lịch tuần...
                    </span>
                  )}

                  {scheduleStatus !== 'loading' && schedules.length === 0 && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-50 text-zinc-500 border border-dashed border-zinc-300">
                      Chưa có lịch tuần
                    </span>
                  )}

                  {schedules.map((s) => {
                    const match = s.weekId.match(/W(\d+)/);
                    const weekNum = match ? match[1] : s.weekId;
                    
                    const formatShortDate = (dateStr: string) => {
                      const d = new Date(dateStr);
                      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    };
                    
                    const dateRange = `${formatShortDate(s.startDate)} - ${formatShortDate(s.endDate)}`;
                    
                    return (
                      <button 
                        key={s.weekId}
                        onClick={() => setCurrentWeekId(s.weekId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          currentWeekId === s.weekId
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200 shadow-sm'
                        }`}
                      >
                        Tuần {weekNum} ({dateRange})
                      </button>
                    );
                  })}
                  
                  {isManager && (
                    <button
                      onClick={() => void handleCreateNewWeek()}
                      disabled={scheduleStatus === 'loading'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center gap-1 cursor-pointer"
                      title="Tạo lịch cho tuần tiếp theo"
                    >
                      <Plus size={12} weight="bold" />
                      Tạo lịch tuần mới
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold mb-1">Trạng thái tuần</label>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${hasSchedules ? getStatusColor(activeSchedule.status) : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                  {hasSchedules ? getStatusText(activeSchedule.status) : 'Chưa có lịch tuần'}
                </span>
              </div>
            </div>

            {scheduleError && (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-rose-800">
                <span className="font-bold">{scheduleError}</span>
                <button
                  type="button"
                  onClick={() => void loadSchedules()}
                  className="shrink-0 px-3 py-1.5 bg-white border border-rose-300 rounded-lg font-bold hover:bg-rose-100"
                >
                  Tải lại lịch
                </button>
              </div>
            )}

            {/* Manager Actions for Week Status */}
            {isManager && hasSchedules && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5 bg-zinc-150 p-1 rounded-xl border border-zinc-200 shadow-sm">
                  <span className="text-zinc-500 text-[10px] font-black uppercase px-2">Trạng thái tuần:</span>
                  {[
                    { status: 'draft', label: 'Nháp', colorClass: 'bg-zinc-600 text-white hover:bg-zinc-700' },
                    { status: 'registration_open', label: 'Mở Đăng Ký', colorClass: 'bg-emerald-600 text-white hover:bg-emerald-700' },
                    { status: 'registration_locked', label: 'Khóa Đăng Ký', colorClass: 'bg-rose-600 text-white hover:bg-rose-700' },
                    { status: 'scheduling', label: 'Xếp Lịch', colorClass: 'bg-amber-600 text-white hover:bg-amber-700' },
                    { status: 'published', label: 'Công Bố', colorClass: 'bg-blue-600 text-white hover:bg-blue-700' }
                  ].map((item) => {
                    const isActive = activeSchedule.status === item.status;
                    return (
                      <button
                        key={item.status}
                        onClick={() => {
                          if (isActive) return;
                          if (window.confirm(`Bạn có chắc chắn muốn chuyển trạng thái tuần sang "${getStatusText(item.status)}"?`)) {
                            void handleScheduleStatus(item.status as any);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          isActive 
                            ? `${item.colorClass} shadow-sm scale-102` 
                            : 'text-zinc-650 hover:bg-zinc-200 hover:text-zinc-950'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold border border-zinc-300 rounded-lg transition-colors"
                >
                  <Printer size={14} />
                  In / PDF
                </button>
              </div>
            )}
          </div>

          {/* 3. Screen View Decider */}
          {activeTab === 'schedule' ? (
            <div>
              {!hasSchedules ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-xs text-zinc-500 max-w-xl mx-auto shadow-sm my-12">
                  <Calendar size={36} className="text-amber-500 mx-auto mb-2" />
                  <h3 className="font-extrabold text-zinc-800 text-sm mb-1">Chưa Có Lịch Tuần</h3>
                  {isManager
                    ? 'Bấm "Tạo lịch tuần mới" để khởi tạo tuần ISO đầu tiên từ backend.'
                    : 'Hiện chưa có lịch tuần nào được công bố hoặc mở đăng ký.'}
                </div>
              ) : isManager ? (
                /* ==================== MANAGER SCHEDULING SCREEN ==================== */
                <div className="space-y-4">
                  {/* Excel-style schedule grid */}
                  <ExcelScheduleGrid />
                </div>
              ) : (
                /* ==================== EMPLOYEE VIEW SCREEN ==================== */
                <div className="space-y-6">
                  {/* Sub-tab selection bar */}
                  <div className="flex justify-center border-b border-zinc-200 pb-px max-w-2xl mx-auto">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEmpScheduleTab('personal')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                          empScheduleTab === 'personal'
                            ? 'border-[#c00000] text-[#c00000]'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Lịch cá nhân
                      </button>
                      <button
                        onClick={() => setEmpScheduleTab('general')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                          empScheduleTab === 'general'
                            ? 'border-[#c00000] text-[#c00000]'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Lịch tổng cả nhà hàng
                      </button>
                      <button
                        onClick={() => setEmpScheduleTab('shifts')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                          empScheduleTab === 'shifts'
                            ? 'border-[#c00000] text-[#c00000]'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Danh mục ca
                      </button>
                    </div>
                  </div>

                  {empScheduleTab === 'personal' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      
                      {/* 1. View Schedule week (if published) */}
                      {activeSchedule.status === 'published' ? (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-4">
                            <Check size={20} className="text-emerald-600" />
                            <div>
                              <h2 className="text-sm font-extrabold text-zinc-900 m-0">Lịch Làm Việc Chính Thức</h2>
                              <p className="text-xs text-zinc-500">Tuần làm việc từ {activeSchedule.startDate} đến {activeSchedule.endDate}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {daysOfWeek.map((day) => {
                              const userAssignment = activeSchedule.assignments[day]?.find(a => a.employeeId === currentUser?.id);
                              
                              return (
                                <div key={day} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                                  <span className="font-bold text-zinc-800 text-xs">{day}</span>
                                  {userAssignment ? (
                                    <div className="text-right">
                                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${getShiftColor(userAssignment.shiftCode)}`}>
                                        {userAssignment.shiftCode} ({shiftCodes.find(s => s.code === userAssignment.shiftCode)?.startTime} - {shiftCodes.find(s => s.code === userAssignment.shiftCode)?.endTime})
                                      </span>
                                      <div className="text-[10px] text-zinc-500 mt-1">Vị trí: {userAssignment.primaryRole}</div>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 text-xs font-medium">OFF (Nghỉ thường)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
                          <Warning size={32} className="text-amber-500 mx-auto" />
                          <h3 className="text-sm font-bold text-zinc-800">Lịch Làm Việc Chưa Được Công Bố</h3>
                          <p className="text-xs text-zinc-500">
                            Quản lý đang điều chỉnh lịch làm việc của chi nhánh. Vui lòng quay lại sau khi có thông báo công bố chính thức.
                          </p>
                        </div>
                      )}

                      {/* 2. Availability Form */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                          <div>
                            <h2 className="text-sm font-extrabold text-zinc-900 m-0">Đăng Ký Nguyện Vọng Tuần Sau</h2>
                            <p className="text-xs text-zinc-500">Hạn cuối đăng ký: {registrationDeadlineText}</p>
                          </div>
                          
                          {activeSchedule.status !== 'registration_open' && (
                            <span className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded">
                              CỔNG ĐÃ KHÓA
                            </span>
                          )}
                        </div>

                        {activeSchedule.status === 'registration_open' ? (
                          <form onSubmit={handlePreferenceSubmit} className="space-y-4">
                            {/* Quick Selection Buttons */}
                            <div className="flex flex-wrap gap-2 justify-center border-b border-zinc-100 pb-4">
                              <button
                                type="button"
                                onClick={() => handleQuickPref('available')}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors border border-zinc-300"
                              >
                                Tôi rảnh cả tuần
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPref('preferred', 'P22')}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors border border-zinc-300"
                              >
                                Tôi chỉ làm ca tối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPref('unavailable')}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors border border-zinc-300"
                              >
                                Đăng ký nghỉ cả tuần
                              </button>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 pb-32">
                              {daysOfWeek.map((day) => (
                                <div key={day} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                                    <span className="font-extrabold text-xs text-zinc-800">{day}</span>
                                    <div className="flex gap-1.5">
                                      {(['available', 'preferred', 'unavailable'] as const).map((typeOption) => (
                                        <button
                                          key={typeOption}
                                          type="button"
                                          onClick={() => {
                                            setTempPrefs(prev => ({
                                              ...prev,
                                              [day]: { ...prev[day], type: typeOption }
                                            }));
                                          }}
                                          className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition-all ${
                                            tempPrefs[day].type === typeOption
                                              ? typeOption === 'available'
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : typeOption === 'preferred'
                                                ? 'bg-[#f4b084] text-zinc-950 border-[#e29d71]'
                                                : 'bg-rose-600 text-white border-rose-600'
                                              : 'bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200'
                                          }`}
                                        >
                                          {typeOption === 'available' ? 'Rảnh' : typeOption === 'preferred' ? 'Muốn Ca' : 'Nghỉ'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Preferred Shift selection */}
                                  {tempPrefs[day].type === 'preferred' && (
                                    <div className="flex items-center gap-2 z-10 relative">
                                      <label className="text-[10px] text-zinc-500 font-extrabold uppercase shrink-0">Ca mong muốn:</label>
                                      <SearchableShiftSelect
                                        value={tempPrefs[day].preferredShift}
                                        onChange={(value) => {
                                          setTempPrefs(prev => ({
                                            ...prev,
                                            [day]: { ...prev[day], preferredShift: value }
                                          }));
                                        }}
                                        shiftCodes={shiftCodes}
                                      />
                                    </div>
                                  )}

                                  {/* Ghi chú cá nhân */}
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Ghi chú thêm (ví dụ: bận việc học, xin ca tối...)"
                                      value={tempPrefs[day].note}
                                      onChange={(e) => {
                                        setTempPrefs(prev => ({
                                          ...prev,
                                          [day]: { ...prev[day], note: e.target.value }
                                        }));
                                      }}
                                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              type="submit"
                              disabled={preferenceSubmitting}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f4b084] hover:bg-[#e29d71] disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-extrabold rounded-xl text-xs transition-colors shadow-sm"
                            >
                              <Check size={16} weight="bold" />
                              {preferenceSubmitting ? 'Đang lưu nguyện vọng...' : 'Gửi Đăng Ký Nguyện Vọng'}
                            </button>
                          </form>
                        ) : (
                          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                            <Lock size={24} className="mx-auto text-[#c00000] mb-2" />
                            Quản lý hiện đã đóng cổng đăng ký nguyện vọng tuần sau. Mọi điều chỉnh vui lòng liên hệ quản lý trực tiếp.
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {empScheduleTab === 'general' && (
                    /* General master schedule view */
                    <div className="space-y-4">
                      {activeSchedule.status === 'published' ? (
                        <div className="space-y-3">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold max-w-2xl mx-auto text-center shadow-sm">
                            Bản lịch làm việc tổng đã được công bố chính thức cho tuần này. Bạn có thể xem lịch của toàn bộ nhân sự dưới đây.
                          </div>
                          <ExcelScheduleGrid />
                        </div>
                      ) : (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center space-y-2 shadow-sm max-w-2xl mx-auto">
                          <Warning size={32} className="text-amber-500 mx-auto" />
                          <h3 className="text-sm font-bold text-zinc-800">Lịch Tổng Chưa Được Công Bố</h3>
                          <p className="text-xs text-zinc-500">
                            Quản lý đang điều chỉnh lịch làm việc của chi nhánh. Lịch tổng sẽ hiển thị tại đây sau khi có thông báo công bố chính thức.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {empScheduleTab === 'shifts' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                      <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                          <div>
                            <h2 className="text-sm font-extrabold text-zinc-900 m-0 uppercase">Danh Mục Ca Làm Việc</h2>
                            <p className="text-xs text-zinc-500">Danh sách các ca đang áp dụng tại nhà hàng để tham khảo khi đăng ký nguyện vọng</p>
                          </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-400">
                              <MagnifyingGlass size={16} />
                            </span>
                            <input
                              type="text"
                              placeholder="Tìm mã ca hoặc tên ca..."
                              value={empShiftSearch}
                              onChange={(e) => setEmpShiftSearch(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#f4b084] transition-all font-semibold"
                            />
                          </div>
                          <div>
                            <select
                              value={empShiftFilter}
                              onChange={(e) => setEmpShiftFilter(e.target.value as any)}
                              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#f4b084] transition-all font-semibold"
                            >
                              <option value="all">Tất cả phòng ban</option>
                              <option value="FOH">FOH (Sảnh / Bar / Phục vụ)</option>
                              <option value="BOH">BOH (Bếp / Rửa bát)</option>
                            </select>
                          </div>
                        </div>

                        {/* Grid of Shift Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {shiftCodes
                            .filter(s => s.status !== 'inactive' && s.type === 'work')
                            .filter(s => {
                              if (!empShiftSearch.trim()) return true;
                              return s.code.toLowerCase().includes(empShiftSearch.toLowerCase()) ||
                                     s.name.toLowerCase().includes(empShiftSearch.toLowerCase());
                            })
                            .filter(s => {
                              if (empShiftFilter === 'all') return true;
                              return s.applicableDepartments?.includes(empShiftFilter);
                            })
                            .map((shift) => (
                              <div 
                                key={shift.code} 
                                className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between hover:border-amber-400 transition-all hover:shadow-md relative overflow-hidden group"
                              >
                                {/* Background Accent based on shift type */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${
                                  shift.isSplit ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />

                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-black border ${getShiftColor(shift.code)}`}>
                                      {shift.code}
                                    </span>
                                    {shift.isSplit && (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                        Ca Gãy
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="font-extrabold text-zinc-900 text-xs leading-snug">{shift.name}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {shift.applicableDepartments?.map(dept => (
                                        <span key={dept} className="bg-zinc-100 text-zinc-600 text-[8px] font-extrabold px-1 py-0.2 rounded uppercase">
                                          {dept}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-1 bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-[11px]">
                                    <div className="flex items-center gap-1.5 text-zinc-700">
                                      <Clock size={12} className="text-zinc-400 shrink-0" />
                                      <span className="font-bold font-mono">
                                        {shift.startTime} - {shift.endTime}
                                      </span>
                                    </div>
                                    {shift.isSplit && (
                                      <div className="flex items-center gap-1.5 text-zinc-700 pl-4 border-l border-zinc-200">
                                        <span className="font-bold font-mono">
                                          &amp; {shift.startTime2} - {shift.endTime2}
                                        </span>
                                      </div>
                                    )}
                                    {shift.breakMinutes ? (
                                      <div className="text-[10px] text-zinc-500 italic mt-0.5">
                                        Thời gian nghỉ: {shift.breakMinutes} phút
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {shiftCodes.filter(s => s.status !== 'inactive' && s.type === 'work').filter(s => {
                          if (!empShiftSearch.trim()) return true;
                          return s.code.toLowerCase().includes(empShiftSearch.toLowerCase()) ||
                                 s.name.toLowerCase().includes(empShiftSearch.toLowerCase());
                        }).filter(s => {
                          if (empShiftFilter === 'all') return true;
                          return s.applicableDepartments?.includes(empShiftFilter);
                        }).length === 0 && (
                          <div className="text-center py-8 text-zinc-400 text-xs">
                            Không tìm thấy ca làm việc nào phù hợp.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ==================== SETTINGS SCREEN (ADMIN/MANAGER ONLY) ==================== */
            isManager ? (
              <div className="space-y-6">
              {catalogStatus === 'loading' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs font-bold text-blue-800">
                  Đang tải danh mục nhân viên và mã ca từ backend...
                </div>
              )}
              {catalogError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-rose-800">
                  <span className="font-bold">{catalogError}</span>
                  <button
                    type="button"
                    onClick={() => void loadCatalogs()}
                    className="shrink-0 px-3 py-1.5 bg-white border border-rose-300 rounded-lg font-bold hover:bg-rose-100"
                  >
                    Tải lại
                  </button>
                </div>
              )}
              
              {/* Employee directory management */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 uppercase">
                    <Users size={18} className="text-[#c00000]" />
                    Quản Lý Nhân Sự & Kỹ Năng
                  </h3>
                  
                  <button
                    onClick={openAddEmployee}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4b084] hover:bg-[#e29d71] text-zinc-950 text-xs font-bold rounded-lg border border-[#e29d71] transition-all shadow-sm"
                  >
                    <Plus size={14} weight="bold" />
                    Thêm Nhân Viên
                  </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Tìm kiếm</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tên, SĐT, Mã NV..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500 font-medium"
                      />
                      <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Bộ lọc Level</label>
                    <select
                      value={empLevelFilter}
                      onChange={(e) =>
                        setEmpLevelFilter(
                          e.target.value as 'all' | 'S1' | 'S2' | 'S3' | 'HUB' | 'NEW' | 'BQL',
                        )
                      }
                      className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="all">Tất cả Level</option>
                      <option value="BQL">Quản lý (QLC / RM)</option>
                      <option value="S1">Nhóm S1 (S1.1 - S1.3)</option>
                      <option value="S2">Nhóm S2 (S2.1 - S2.3)</option>
                      <option value="S3">Nhóm S3 (S3.1 - S3.3)</option>
                      <option value="HUB">HUB (Độc lập)</option>
                      <option value="NEW">New (Mới)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Bộ lọc Nhóm Lịch</label>
                    <select
                      value={empGroupFilter}
                      onChange={(e) => setEmpGroupFilter(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="all">Tất cả Nhóm lịch</option>
                      <option value="BAN QUẢN LÝ">BAN QUẢN LÝ</option>
                      <option value="ORDER + PHỤC VỤ">ORDER + PHỤC VỤ</option>
                      <option value="BOY">BOY</option>
                      <option value="BOH (BẾP)">BOH (BẾP)</option>
                      <option value="TẠP VỤ">TẠP VỤ</option>
                      <option value="BAR">BAR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Bộ lọc Kỹ năng</label>
                    <select
                      value={empSkillFilter}
                      onChange={(e) => setEmpSkillFilter(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="all">Tất cả kỹ năng</option>
                      <option value="Order">Biết làm Order</option>
                      <option value="Phục vụ">Biết làm Phục vụ</option>
                      <option value="Boy">Biết làm Boy</option>
                      <option value="Bếp nóng">Biết làm Bếp nóng</option>
                      <option value="Bếp salad">Biết làm Bếp salad</option>
                      <option value="Bếp thịt">Biết làm Bếp thịt</option>
                      <option value="Tạp vụ">Biết làm Tạp vụ</option>
                      <option value="Bar">Biết làm Bar</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Mã NV</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Họ Tên</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">SĐT</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Level</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Bộ Phận Chính</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Kỹ Năng</th>
                        <th className="p-2.5 uppercase tracking-wider text-[10px] text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {(() => {
                        const filtered = employees.filter(emp => {
                          // 1. Search filter
                          const matchSearch = 
                            emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
                            emp.phone.includes(empSearch) ||
                            emp.id.toLowerCase().includes(empSearch.toLowerCase());
                          if (!matchSearch) return false;

                          // 2. Level filter
                          if (empLevelFilter !== 'all') {
                            if (empLevelFilter === 'S1') {
                              if (!emp.level.startsWith('S1.')) return false;
                            } else if (empLevelFilter === 'S2') {
                              if (!emp.level.startsWith('S2.')) return false;
                            } else if (empLevelFilter === 'S3') {
                              if (!emp.level.startsWith('S3.')) return false;
                            } else if (empLevelFilter === 'BQL') {
                              if (emp.level !== 'QLC' && emp.level !== 'RM') return false;
                            } else {
                              if (emp.level !== empLevelFilter) return false;
                            }
                          }

                          // 3. Group filter
                          if (empGroupFilter !== 'all') {
                            if (emp.scheduleGroup !== empGroupFilter) return false;
                          }

                          // 4. Skill filter
                          if (empSkillFilter !== 'all') {
                            if (!emp.skills[empSkillFilter]) return false;
                          }

                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-zinc-400 font-medium bg-zinc-50 border border-dashed border-zinc-200">
                                Không tìm thấy nhân viên phù hợp với bộ lọc.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(emp => (
                          <tr
                            key={emp.id}
                            className={`hover:bg-zinc-50 transition-colors ${
                              emp.status === 'inactive' ? 'opacity-55' : ''
                            }`}
                          >
                            <td className="p-2.5 font-mono text-zinc-500">
                              {emp.level === 'HUB' || emp.id.startsWith('HUB_') ? '-' : emp.id}
                            </td>
                            <td className="p-2.5 font-bold text-zinc-800">{emp.name}</td>
                            <td className="p-2.5 font-mono text-zinc-600">{emp.phone.replace(/\./g, '')}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                emp.level === 'QLC' || emp.level === 'RM'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : emp.level === 'HUB'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : emp.level === 'NEW'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {emp.level}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[10px] font-bold border border-zinc-200">
                                {emp.primaryDepartment}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(emp.skills).map(([skill, hasSkill]) => (
                                  hasSkill && (
                                    <span key={skill} className="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 rounded text-[10px] border border-zinc-200 font-medium">
                                      {skill}
                                    </span>
                                  )
                                ))}
                                {(!emp.skills || Object.values(emp.skills).filter(Boolean).length === 0) && (
                                  <span className="text-zinc-400 italic text-[10px]">-</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openEditEmployee(emp)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold border border-zinc-300 rounded transition-all"
                                >
                                  <Pencil size={11} />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => void handleEmployeeStatus(emp)}
                                  disabled={emp.id === currentUser?.id}
                                  className={`px-2.5 py-1 text-[10px] font-bold border rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                    emp.status === 'active'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {emp.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shift codes setup */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 uppercase">
                    <Clock size={18} className="text-[#c00000]" />
                    Cấu Hình Mã Ca Làm Việc
                  </h3>
                  
                  <button
                    onClick={openAddShift}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4b084] hover:bg-[#e29d71] text-zinc-950 text-xs font-bold rounded-lg border border-[#e29d71] transition-all shadow-sm"
                  >
                    <Plus size={14} weight="bold" />
                    Thêm Mã Ca
                  </button>
                </div>

                {/* Search and Filters Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Tìm mã ca hoặc tên ca..."
                      value={shiftSearch}
                      onChange={(e) => setShiftSearch(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-amber-500"
                    />
                    <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
                    {([
                      { id: 'all', label: 'Tất cả' },
                      { id: 'split', label: 'Ca gãy (S)' },
                      { id: 'parttime', label: 'Ca tối (P)' },
                      { id: 'other', label: 'Ca khác (A/KF)' },
                      { id: 'off', label: 'Nghỉ/Phép' },
                    ] satisfies Array<{
                      id: 'all' | 'split' | 'parttime' | 'other' | 'off';
                      label: string;
                    }>).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setShiftFilterTab(tab.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border ${
                          shiftFilterTab === tab.id
                            ? 'bg-[#f4b084] text-zinc-950 shadow-sm border-[#e29d71]'
                            : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid shifts listing */}
                {(() => {
                  const filteredShifts = shiftCodes.filter(shift => {
                    const matchesSearch = 
                      shift.code.toLowerCase().includes(shiftSearch.toLowerCase()) || 
                      shift.name.toLowerCase().includes(shiftSearch.toLowerCase());
                    if (!matchesSearch) return false;

                    if (shiftFilterTab === 'split') {
                      return !!shift.isSplit || shift.code.startsWith('S');
                    }
                    if (shiftFilterTab === 'parttime') {
                      return shift.code.startsWith('P') && !shift.isSplit;
                    }
                    if (shiftFilterTab === 'off') {
                      return ['R', 'OFF', 'TS', 'NPL', 'KP', 'N', 'AL'].includes(shift.code) || shift.type === 'off' || shift.type === 'leave';
                    }
                    if (shiftFilterTab === 'other') {
                      const isSplit = !!shift.isSplit || shift.code.startsWith('S');
                      const isPart = shift.code.startsWith('P');
                      const isOff = ['R', 'OFF', 'TS', 'NPL', 'KP', 'N', 'AL'].includes(shift.code) || shift.type === 'off' || shift.type === 'leave';
                      return !isSplit && !isPart && !isOff;
                    }
                    return true;
                  });

                  if (filteredShifts.length === 0) {
                    return (
                      <div className="text-center py-6 text-zinc-400 text-xs font-medium bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                        Không tìm thấy mã ca làm việc phù hợp.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="text-[10px] text-zinc-500 font-bold px-1">
                        Tìm thấy {filteredShifts.length} mã ca làm việc
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredShifts.map(shift => (
                          <div
                            key={shift.code}
                            className={`p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm hover:border-zinc-300 transition-all ${
                              shift.status === 'inactive' ? 'opacity-55' : ''
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getShiftColor(shift.code)}`}>
                                  {shift.code}
                                </span>
                                <span className="font-bold text-zinc-800 text-xs">{shift.name}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-2 font-mono">
                                {shift.isSplit ? (
                                  <span>
                                    Thời gian: {shift.startTime} - {shift.endTime} &amp; {shift.startTime2} - {shift.endTime2} (Nghỉ: {shift.breakMinutes}p)
                                  </span>
                                ) : (
                                  <span>
                                    Thời gian: {shift.startTime} - {shift.endTime} (Nghỉ: {shift.breakMinutes}p)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditShift(shift)}
                                className="p-1 text-zinc-400 hover:text-zinc-700 bg-white border border-zinc-200 rounded transition-all"
                                title="Sửa mã ca"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => void handleShiftStatus(shift)}
                                className={`px-2 py-1 text-[10px] font-bold border rounded transition-all ${
                                  shift.status === 'inactive'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                              >
                                {shift.status === 'inactive' ? 'Bật' : 'Tắt'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-xs text-zinc-500 max-w-md mx-auto shadow-sm my-12">
                <Warning size={36} className="text-rose-500 mx-auto mb-2" />
                <h3 className="font-extrabold text-zinc-800 text-sm mb-1">Không Có Quyền Truy Cập</h3>
                Bạn không có quyền xem trang cấu hình này. Chức năng này chỉ dành cho cấp Quản lý.
              </div>
            )
          )}

        </main>
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        empForm={empForm}
        setEmpForm={setEmpForm}
        empFormMode={empFormMode}
        onSubmit={handleSaveEmployee}
        isSubmitting={catalogSubmitting}
      />

      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        shiftForm={shiftForm}
        setShiftForm={setShiftForm}
        shiftFormMode={shiftFormMode}
        onSubmit={handleSaveShift}
        isSubmitting={catalogSubmitting}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full no-print">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={`p-3.5 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 animate-slide-in-right ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <Check size={16} className="text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <Warning size={16} className="text-rose-600 shrink-0" />}
              {toast.type === 'warning' && <Warning size={16} className="text-amber-600 shrink-0" />}
              {toast.type === 'info' && <Calendar size={16} className="text-blue-600 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button className="text-zinc-400 hover:text-zinc-650 shrink-0">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
