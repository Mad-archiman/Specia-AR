'use client';

import { useState, useEffect, useCallback } from 'react';

interface CompanyItem {
  _id: string;
  companyName: string;
  contact: string;
  email: string;
  projectCount: number;
}

interface ProjectItem {
  _id: string;
  companyId: string;
  year: string;
  projectName: string;
  managerName: string;
  contact: string;
  email: string;
  grantCode: string;
  completed: boolean;
}

interface GeoLocation {
  lat: number;
  lon: number;
  alt?: number;
}

interface ArModelItem {
  _id: string;
  code: string;
  name: string;
  geoLocation?: GeoLocation | null;
  createdAt?: string;
}

const bgStyle = { background: 'linear-gradient(180deg, #281e5a 0%, #50288c 100%)' };

export default function AdminPage() {
  const [adminTab, setAdminTab] = useState<'companies' | 'ar-models'>('companies');
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<{ company: CompanyItem | null; projects: ProjectItem[] }>({ company: null, projects: [] });
  const [loading, setLoading] = useState(true);
  const [companyModal, setCompanyModal] = useState<'add' | 'edit' | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [projectModal, setProjectModal] = useState<'add' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [formError, setFormError] = useState('');

  const [arModels, setArModels] = useState<ArModelItem[]>([]);
  const [arModelsLoading, setArModelsLoading] = useState(false);
  const [arUploading, setArUploading] = useState(false);
  const [arModelEditModal, setArModelEditModal] = useState<ArModelItem | null>(null);

  const fetchArModels = useCallback(async () => {
    setArModelsLoading(true);
    const res = await fetch('/api/admin/ar-models');
    const data = await res.json();
    if (res.ok) setArModels(data.items ?? []);
    setArModelsLoading(false);
  }, []);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch('/api/admin/companies');
    const data = await res.json();
    if (res.ok) setCompanies(data.items ?? []);
    setLoading(false);
  }, []);

  const fetchCompanyDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/companies/${id}`);
    const data = await res.json();
    if (res.ok) {
      setCompanyDetail({
        company: data.company ? { ...data.company, projectCount: (data.projects ?? []).length } : null,
        projects: data.projects ?? [],
      });
    } else {
      setCompanyDetail({ company: null, projects: [] });
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (adminTab === 'ar-models') fetchArModels();
  }, [adminTab, fetchArModels]);

  useEffect(() => {
    if (selectedId) fetchCompanyDetail(selectedId);
    else setCompanyDetail({ company: null, projects: [] });
  }, [selectedId, fetchCompanyDetail]);

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('이 회사와 관련 프로젝트를 모두 삭제할까요?')) return;
    const res = await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCompanies((prev) => prev.filter((c) => c._id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setCompanyDetail({ company: null, projects: [] });
      }
    } else {
      const data = await res.json();
      alert(data.error ?? '삭제 실패');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('이 프로젝트를 삭제할까요?')) return;
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
    if (res.ok && selectedId) {
      fetchCompanyDetail(selectedId);
    } else {
      const data = await res.json();
      alert(data.error ?? '삭제 실패');
    }
  };

  const handleDeleteArModel = async (id: string) => {
    if (!confirm('이 AR 모델을 삭제할까요?')) return;
    const res = await fetch(`/api/admin/ar-models/${id}`, { method: 'DELETE' });
    if (res.ok) fetchArModels();
    else { const data = await res.json(); alert(data.error ?? '삭제 실패'); }
  };

  return (
    <main className="flex min-h-full flex-1 flex-col overflow-hidden" style={bgStyle}>
      <div className="flex shrink-0 gap-2 border-b border-white/20 px-4 py-2">
        <button type="button" onClick={() => setAdminTab('companies')} className={`rounded px-4 py-2 text-sm font-medium ${adminTab === 'companies' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}>회사 목록</button>
        <button type="button" onClick={() => setAdminTab('ar-models')} className={`rounded px-4 py-2 text-sm font-medium ${adminTab === 'ar-models' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}>AR 모델</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {adminTab === 'ar-models' ? (
          <section className="flex w-full flex-col p-4">
            <h2 className="mb-4 text-lg font-medium text-white">AR 모델 (지정번호 4자리)</h2>
            <form className="mb-6 flex flex-wrap items-end gap-4 rounded border border-white/20 bg-black/20 p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
                const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]');
                const file = fileInput?.files?.[0];
                if (!file) { alert('GLB 파일을 선택해 주세요.'); return; }
                setArUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  if (nameInput?.value) fd.append('name', nameInput.value);
                  const res = await fetch('/api/admin/ar-models', { method: 'POST', body: fd });
                  const data = await res.json();
                  if (res.ok) { alert(`업로드 완료. 지정번호: ${data.code}`); fileInput.value = ''; if (nameInput) nameInput.value = ''; fetchArModels(); }
                  else alert(data.error ?? '업로드 실패');
                } finally { setArUploading(false); }
              }}
            >
              <div>
                <label className="mb-1 block text-sm text-white/70">모델명 (선택)</label>
                <input name="name" type="text" className="rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" placeholder="예: 건물 A" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">GLB 파일 *</label>
                <input type="file" accept=".glb" required className="text-white/90" />
              </div>
              <button type="submit" disabled={arUploading} className="rounded bg-[#3c2896] px-4 py-2 text-sm text-white hover:bg-[#50288c] disabled:opacity-50">{arUploading ? '업로드 중…' : '업로드'}</button>
            </form>
            <div className="rounded border border-white/20 bg-black/20">
              <div className="grid grid-cols-[100px_1fr_auto] gap-4 border-b border-white/20 px-4 py-2 text-sm text-white/70"><span>지정번호</span><span>이름</span><span /></div>
              {arModelsLoading ? <div className="p-4 text-white/70">로딩 중…</div> : arModels.length === 0 ? <div className="p-4 text-white/70">등록된 AR 모델이 없습니다.</div> : arModels.map((m) => (
                <div key={m._id} className="grid grid-cols-[100px_1fr_auto] gap-4 border-b border-white/10 px-4 py-2 text-sm text-white">
                  <span className="font-mono font-medium">{m.code}</span>
                  <span>{m.name || '-'}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setArModelEditModal(m)} className="rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30">수정</button>
                    <button type="button" onClick={() => handleDeleteArModel(m._id)} className="rounded bg-red-900/50 px-2 py-1 text-xs text-white hover:bg-red-900/70">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
        {/* 좌측: 회사 목록 (4:6) */}
        <section className="flex w-2/5 flex-col border-r border-white/20">
          <div className="flex shrink-0 items-center justify-between border-b border-white/20 px-4 py-3">
            <h2 className="text-lg font-medium text-white">회사 목록</h2>
            <button
              type="button"
              onClick={() => { setFormError(''); setCompanyModal('add'); }}
              className="rounded bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
            >
              추가
            </button>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 border-b border-white/20 px-4 py-2 text-xs text-white/70">
            <span>회사명</span>
            <span>연락처</span>
            <span>이메일</span>
            <span>프로젝트수</span>
            <span />
          </div>
          <ul className="flex-1 overflow-y-auto">
            {loading ? (
              <li className="p-4 text-white/70">로딩 중…</li>
            ) : companies.length === 0 ? (
              <li className="p-4 text-white/70">등록된 회사가 없습니다.</li>
            ) : (
              companies.map((c) => (
                <li
                  key={c._id}
                  className={`grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 border-b border-white/10 px-4 py-2 text-sm ${selectedId === c._id ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                  <button
                    type="button"
                    className="text-left text-white"
                    onClick={() => setSelectedId(c._id)}
                  >
                    {c.companyName || '-'}
                  </button>
                  <span className="truncate text-white/90">{c.contact || '-'}</span>
                  <span className="truncate text-white/90">{c.email || '-'}</span>
                  <span className="text-white/80">{c.projectCount}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingCompany(c); setCompanyModal('edit'); }}
                      className="rounded bg-white/20 px-2 py-0.5 text-xs text-white hover:bg-white/30"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCompany(c._id); }}
                      className="rounded bg-red-900/50 px-2 py-0.5 text-xs text-white hover:bg-red-900/70"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* 우측: 상세 (프로젝트 목록) */}
        <section className="flex w-3/5 flex-col">
          {selectedId && companyDetail.company ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-white/20 px-4 py-3">
                <h2 className="text-lg font-medium text-white">{companyDetail.company.companyName} – 상세</h2>
                <button
                  type="button"
                  onClick={() => { setFormError(''); setEditingProject(null); setProjectModal('add'); }}
                  className="rounded bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
                >
                  프로젝트 추가
                </button>
              </div>
              <div className="grid grid-cols-[60px_1fr_80px_1fr_1fr_1fr_70px_minmax(100px,auto)] gap-2 border-b border-white/20 px-4 py-2 text-xs text-white/70">
                <span>년도</span>
                <span>프로젝트명</span>
                <span>담당자명</span>
                <span>연락처</span>
                <span>이메일</span>
                <span>부여코드</span>
                <span>완료</span>
                <span />
              </div>
              <ul className="flex-1 overflow-y-auto">
                {companyDetail.projects.length === 0 ? (
                  <li className="p-4 text-white/70">등록된 프로젝트가 없습니다.</li>
                ) : (
                  companyDetail.projects.map((p) => (
                    <li
                      key={p._id}
                      className="grid grid-cols-[60px_1fr_80px_1fr_1fr_1fr_70px_minmax(100px,auto)] gap-2 border-b border-white/10 px-4 py-2 text-sm text-white/90"
                    >
                      <span>{p.year || '-'}</span>
                      <span className="truncate">{p.projectName || '-'}</span>
                      <span className="truncate">{p.managerName || '-'}</span>
                      <span className="truncate">{p.contact || '-'}</span>
                      <span className="truncate">{p.email || '-'}</span>
                      <span className="truncate">{p.grantCode || '-'}</span>
                      <span>{p.completed ? 'Y' : 'N'}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingProject(p); setFormError(''); setProjectModal('edit'); }}
                          className="rounded bg-white/20 px-2 py-0.5 text-xs text-white hover:bg-white/30"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p._id)}
                          className="rounded bg-red-900/50 px-2 py-0.5 text-xs text-white hover:bg-red-900/70"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-white/50">
              회사를 선택하면 상세 내용이 표시됩니다.
            </div>
          )}
        </section>
          </>
        )}
      </div>

      {/* 회사 추가/수정 모달 */}
      {companyModal && (
        <CompanyFormModal
          mode={companyModal}
          initial={companyModal === 'edit' ? editingCompany ?? undefined : undefined}
          onClose={() => { setCompanyModal(null); setEditingCompany(null); setFormError(''); }}
          onSuccess={() => {
            setCompanyModal(null);
            setEditingCompany(null);
            fetchCompanies();
            if (selectedId) fetchCompanyDetail(selectedId);
          }}
          error={formError}
          setError={setFormError}
        />
      )}

      {/* 프로젝트 추가/수정 모달 */}
      {projectModal && selectedId && (
        <ProjectFormModal
          mode={projectModal}
          companyId={selectedId}
          initial={editingProject ?? undefined}
          onClose={() => { setProjectModal(null); setEditingProject(null); setFormError(''); }}
          onSuccess={() => {
            setProjectModal(null);
            setEditingProject(null);
            fetchCompanyDetail(selectedId);
          }}
          error={formError}
          setError={setFormError}
        />
      )}

      {/* AR 모델 수정 모달 */}
      {arModelEditModal && (
        <ArModelEditModal
          model={arModelEditModal}
          onClose={() => setArModelEditModal(null)}
          onSuccess={() => { setArModelEditModal(null); fetchArModels(); }}
        />
      )}
    </main>
  );
}

function ArModelEditModal({ model, onClose, onSuccess }: { model: ArModelItem; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(model.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState(
    model.geoLocation?.lat != null ? Number(model.geoLocation.lat).toFixed(6) : ''
  );
  const [lon, setLon] = useState(
    model.geoLocation?.lon != null ? Number(model.geoLocation.lon).toFixed(6) : ''
  );
  const [alt, setAlt] = useState(model.geoLocation?.alt?.toString() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (file) fd.append('file', file);
      fd.append('lat', lat.trim());
      fd.append('lon', lon.trim());
      fd.append('alt', alt.trim());
      const res = await fetch(`/api/admin/ar-models/${model._id}`, { method: 'PUT', body: fd });
      const data = await res.json();
      if (res.ok) onSuccess();
      else setError(data.error ?? '수정 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-[#1a1a1a] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-medium text-white">AR 모델 수정</h3>
        <p className="mb-4 text-sm text-white/70">지정번호: <span className="font-mono font-medium">{model.code}</span></p>
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">모델명</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" placeholder="예: 건물 A" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">GLB 파일 교체 (선택)</label>
            <input type="file" accept=".glb" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-white/90" />
            <p className="mt-1 text-xs text-white/50">선택 시 기존 파일이 교체됩니다.</p>
          </div>
          <div className="space-y-2 border-t border-white/20 pt-4">
            <p className="text-sm font-medium text-white/80">위치 정보 (Location ON용)</p>
            <p className="text-xs text-white/50">SketchUp 모델 원점의 실제 위경도·고도. 비우면 Location ON 비활성화.</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-0.5 block text-xs text-white/60">위도</label>
                <input type="text" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="37.566500" className="w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-white/50" />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-white/60">경도</label>
                <input type="text" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="126.978000" className="w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-white/50" />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-white/60">고도(m)</label>
                <input type="text" inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="0" className="w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-white/50" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white hover:bg-white/20">취소</button>
            <button type="submit" disabled={loading} className="rounded bg-[#3c2896] px-4 py-2 text-white hover:bg-[#50288c] disabled:opacity-50">{loading ? '저장 중…' : '저장'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompanyFormModal({
  mode,
  initial,
  onClose,
  onSuccess,
  error,
  setError,
}: {
  mode: 'add' | 'edit';
  initial?: CompanyItem;
  onClose: () => void;
  onSuccess: () => void;
  error: string;
  setError: (s: string) => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) {
      setError('회사명을 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const url = mode === 'add' ? '/api/admin/companies' : `/api/admin/companies/${initial!._id}`;
      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), contact: contact.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) onSuccess();
      else setError(data.error ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-[#1a1a1a] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-medium text-white">{mode === 'add' ? '회사 추가' : '회사 수정'}</h3>
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">회사명 *</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">연락처</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white hover:bg-white/20">
              취소
            </button>
            <button type="submit" disabled={loading} className="rounded bg-[#3c2896] px-4 py-2 text-white hover:bg-[#50288c] disabled:opacity-50">
              {loading ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectFormModal({
  mode,
  companyId,
  initial,
  onClose,
  onSuccess,
  error,
  setError,
}: {
  mode: 'add' | 'edit';
  companyId: string;
  initial?: ProjectItem;
  onClose: () => void;
  onSuccess: () => void;
  error: string;
  setError: (s: string) => void;
}) {
  const [year, setYear] = useState(initial?.year ?? '');
  const [projectName, setProjectName] = useState(initial?.projectName ?? '');
  const [managerName, setManagerName] = useState(initial?.managerName ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [grantCode, setGrantCode] = useState(initial?.grantCode ?? '');
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { year, projectName, managerName, contact, email, grantCode, completed };
      const url = mode === 'add' ? `/api/admin/companies/${companyId}/projects` : `/api/admin/projects/${initial!._id}`;
      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) onSuccess();
      else setError(data.error ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[#1a1a1a] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-medium text-white">{mode === 'add' ? '프로젝트 추가' : '프로젝트 수정'}</h3>
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-white/70">년도</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">프로젝트명</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">담당자명</label>
            <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">연락처</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">부여코드</label>
            <input value={grantCode} onChange={(e) => setGrantCode(e.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="completed" checked={completed} onChange={(e) => setCompleted(e.target.checked)} className="rounded" />
            <label htmlFor="completed" className="text-sm text-white/70">완료여부</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white hover:bg-white/20">취소</button>
            <button type="submit" disabled={loading} className="rounded bg-[#3c2896] px-4 py-2 text-white hover:bg-[#50288c] disabled:opacity-50">{loading ? '저장 중…' : '저장'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
