import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadProject, saveProject } from '../storage/projectsStore';
import {
  Project,
  Unit,
  Floor,
  Room,
  Tariff,
  Scenario,
  RuleSet,
  Jurisdiction,
  UnitType,
  RoomType,
  TariffUnit,
  TariffSource,
  Person,
  TipoContratto,
  Contract,
} from '../models/types';

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_RULESET: RuleSet = {
  accessoryDirectCoeff: 1 / 3,
  accessoryComplementaryCoeff: 1 / 4,
  applyLargeRoomRagguaglio: false,
  vanoMaxMq: 26,
  dipendenzePct: 0,
};

const DEFAULT_JURISDICTION: Jurisdiction = {
  comune: '',
  zonaCensuaria: '',
  note: '',
};

function makeDefaultProject(): Project {
  return {
    id: uuidv4(),
    name: 'Nuovo Progetto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jurisdiction: DEFAULT_JURISDICTION,
    ruleSet: DEFAULT_RULESET,
    units: [],
    tariffs: [],
    scenarios: [],
    persons: [],
    contracts: [],
  };
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface ProjectContextValue {
  /** Navigate back to the project list */
  closeProject: () => void;
  project: Project;
  lastSaved: Date | null;

  // project-level
  updateName: (name: string) => void;
  updateJurisdiction: (updates: Partial<Jurisdiction>) => void;
  updateRuleSet: (updates: Partial<RuleSet>) => void;
  exportProject: () => void;
  importProject: (json: string) => void;
  resetProject: () => void;

  // units
  addUnit: (name: string, unitType: UnitType, category: string, classe: string) => void;
  updateUnit: (id: string, updates: Partial<Omit<Unit, 'id' | 'floors'>>) => void;
  deleteUnit: (id: string) => void;

  // floors
  addFloor: (unitId: string, name: string) => void;
  updateFloor: (unitId: string, floorId: string, name: string) => void;
  deleteFloor: (unitId: string, floorId: string) => void;

  // rooms
  addRoom: (unitId: string, floorId: string, name: string, roomType: RoomType, areaMq: number, notes?: string, accessoDaInterno?: boolean, impiantiPresenti?: boolean) => void;
  updateRoom: (unitId: string, floorId: string, roomId: string, updates: Partial<Omit<Room, 'id'>>) => void;
  deleteRoom: (unitId: string, floorId: string, roomId: string) => void;

  // tariffs
  addTariff: (category: string, classe: string, value: number, unit: TariffUnit, sourceType: TariffSource, sourceNote: string) => void;
  updateTariff: (id: string, updates: Partial<Omit<Tariff, 'id'>>) => void;
  deleteTariff: (id: string) => void;

  // scenarios
  addScenario: (partial: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, updates: Partial<Omit<Scenario, 'id'>>) => void;
  deleteScenario: (id: string) => void;

  // persons
  addPerson: (name: string, tipoContratto: TipoContratto, redditoNettoMensile: number, notes?: string) => void;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id'>>) => void;
  deletePerson: (id: string) => void;

  // contracts
  addContract: (partial: Omit<Contract, 'id'>) => void;
  updateContract: (id: string, updates: Partial<Omit<Contract, 'id'>>) => void;
  deleteContract: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
}

// ── Helper: immutable unit/floor/room updaters ────────────────────────────────

function updateUnitsIn(units: Unit[], unitId: string, fn: (u: Unit) => Unit): Unit[] {
  return units.map(u => (u.id === unitId ? fn(u) : u));
}

function updateFloorsIn(unit: Unit, floorId: string, fn: (f: Floor) => Floor): Unit {
  return { ...unit, floors: unit.floors.map(f => (f.id === floorId ? fn(f) : f)) };
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface ProjectProviderProps {
  children: React.ReactNode;
  projectId: string;
  onClose: () => void;
  onProjectSaved?: (project: Project) => void;
}

export function ProjectProvider({ children, projectId, onClose, onProjectSaved }: ProjectProviderProps) {
  const [project, setProject] = useState<Project>(
    () => loadProject(projectId) ?? makeDefaultProject(),
  );

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save on every change
  useEffect(() => {
    const updated: Project = { ...project, updatedAt: new Date().toISOString() };
    saveProject(updated);
    setLastSaved(new Date());
    onProjectSaved?.(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  // ── Patch helpers ────────────────────────────────────────────────────────────

  const patch = useCallback((fn: (p: Project) => Project) => {
    setProject(prev => fn(prev));
  }, []);

  // ── Project-level ops ─────────────────────────────────────────────────────────

  const updateName = useCallback((name: string) => patch(p => ({ ...p, name })), [patch]);

  const updateJurisdiction = useCallback(
    (updates: Partial<Jurisdiction>) =>
      patch(p => ({ ...p, jurisdiction: { ...p.jurisdiction, ...updates } })),
    [patch],
  );

  const updateRuleSet = useCallback(
    (updates: Partial<RuleSet>) =>
      patch(p => ({ ...p, ruleSet: { ...p.ruleSet, ...updates } })),
    [patch],
  );

  const exportProject = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const importProject = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as Project;
      // Keep current project ID — we are replacing the content of this project
      setProject(prev => ({ ...imported, id: prev.id, createdAt: prev.createdAt }));
    } catch {
      alert('File JSON non valido');
    }
  }, []);

  const resetProject = useCallback(() => {
    if (window.confirm('Sei sicuro? Tutti i dati verranno eliminati.')) {
      setProject(prev => ({ ...makeDefaultProject(), id: prev.id, createdAt: prev.createdAt }));
    }
  }, []);

  const closeProject = useCallback(() => onClose(), [onClose]);

  // ── Units ─────────────────────────────────────────────────────────────────────

  const addUnit = useCallback(
    (name: string, unitType: UnitType, targetCategory: string, targetClass: string) =>
      patch(p => ({
        ...p,
        units: [
          ...p.units,
          { id: uuidv4(), name, unitType, targetCategory, targetClass, floors: [] },
        ],
      })),
    [patch],
  );

  const updateUnit = useCallback(
    (id: string, updates: Partial<Omit<Unit, 'id' | 'floors'>>) =>
      patch(p => ({ ...p, units: updateUnitsIn(p.units, id, u => ({ ...u, ...updates })) })),
    [patch],
  );

  const deleteUnit = useCallback(
    (id: string) =>
      patch(p => ({ ...p, units: p.units.filter(u => u.id !== id) })),
    [patch],
  );

  // ── Floors ────────────────────────────────────────────────────────────────────

  const addFloor = useCallback(
    (unitId: string, name: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u => ({
          ...u,
          floors: [...u.floors, { id: uuidv4(), name, rooms: [] }],
        })),
      })),
    [patch],
  );

  const updateFloor = useCallback(
    (unitId: string, floorId: string, name: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({ ...f, name })),
        ),
      })),
    [patch],
  );

  const deleteFloor = useCallback(
    (unitId: string, floorId: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u => ({
          ...u,
          floors: u.floors.filter(f => f.id !== floorId),
        })),
      })),
    [patch],
  );

  // ── Rooms ─────────────────────────────────────────────────────────────────────

  const addRoom = useCallback(
    (unitId: string, floorId: string, name: string, roomType: RoomType, areaMq: number, notes = '', accessoDaInterno?: boolean, impiantiPresenti?: boolean) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: [...f.rooms, { id: uuidv4(), name, roomType, areaMq, notes, accessoDaInterno, impiantiPresenti }],
          })),
        ),
      })),
    [patch],
  );

  const updateRoom = useCallback(
    (unitId: string, floorId: string, roomId: string, updates: Partial<Omit<Room, 'id'>>) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: f.rooms.map(r => (r.id === roomId ? { ...r, ...updates } : r)),
          })),
        ),
      })),
    [patch],
  );

  const deleteRoom = useCallback(
    (unitId: string, floorId: string, roomId: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: f.rooms.filter(r => r.id !== roomId),
          })),
        ),
      })),
    [patch],
  );

  // ── Tariffs ───────────────────────────────────────────────────────────────────

  const addTariff = useCallback(
    (category: string, classe: string, value: number, unit: TariffUnit, sourceType: TariffSource, sourceNote: string) =>
      patch(p => ({
        ...p,
        tariffs: [...p.tariffs, { id: uuidv4(), category, classe, value, unit, sourceType, sourceNote }],
      })),
    [patch],
  );

  const updateTariff = useCallback(
    (id: string, updates: Partial<Omit<Tariff, 'id'>>) =>
      patch(p => ({
        ...p,
        tariffs: p.tariffs.map(t => (t.id === id ? { ...t, ...updates } : t)),
      })),
    [patch],
  );

  const deleteTariff = useCallback(
    (id: string) =>
      patch(p => ({ ...p, tariffs: p.tariffs.filter(t => t.id !== id) })),
    [patch],
  );

  // ── Scenarios ─────────────────────────────────────────────────────────────────

  const addScenario = useCallback(
    (partial: Omit<Scenario, 'id'>) =>
      patch(p => ({ ...p, scenarios: [...p.scenarios, { id: uuidv4(), ...partial }] })),
    [patch],
  );

  const updateScenario = useCallback(
    (id: string, updates: Partial<Omit<Scenario, 'id'>>) =>
      patch(p => ({
        ...p,
        scenarios: p.scenarios.map(s => (s.id === id ? { ...s, ...updates } : s)),
      })),
    [patch],
  );

  const deleteScenario = useCallback(
    (id: string) =>
      patch(p => ({ ...p, scenarios: p.scenarios.filter(s => s.id !== id) })),
    [patch],
  );

  // ── Persons ──────────────────────────────────────────────────────────────────────

  const addPerson = useCallback(
    (name: string, tipoContratto: TipoContratto, redditoNettoMensile: number, notes = '') =>
      patch(p => ({
        ...p,
        persons: [...(p.persons ?? []), { id: uuidv4(), name, tipoContratto, redditoNettoMensile, notes }],
      })),
    [patch],
  );

  const updatePerson = useCallback(
    (id: string, updates: Partial<Omit<Person, 'id'>>) =>
      patch(p => ({
        ...p,
        persons: (p.persons ?? []).map(per => (per.id === id ? { ...per, ...updates } : per)),
      })),
    [patch],
  );

  const deletePerson = useCallback(
    (id: string) =>
      patch(p => ({ ...p, persons: (p.persons ?? []).filter(per => per.id !== id) })),
    [patch],
  );

  // ── Contracts ─────────────────────────────────────────────────────────────────

  const addContract = useCallback(
    (partial: Omit<Contract, 'id'>) =>
      patch(p => ({ ...p, contracts: [...(p.contracts ?? []), { id: uuidv4(), ...partial }] })),
    [patch],
  );

  const updateContract = useCallback(
    (id: string, updates: Partial<Omit<Contract, 'id'>>) =>
      patch(p => ({
        ...p,
        contracts: (p.contracts ?? []).map(c => (c.id === id ? { ...c, ...updates } : c)),
      })),
    [patch],
  );

  const deleteContract = useCallback(
    (id: string) =>
      patch(p => ({ ...p, contracts: (p.contracts ?? []).filter(c => c.id !== id) })),
    [patch],
  );

  // ── Value ─────────────────────────────────────────────────────────────────────

  const value: ProjectContextValue = {
    project,
    lastSaved,
    closeProject,
    updateName,
    updateJurisdiction,
    updateRuleSet,
    exportProject,
    importProject,
    resetProject,
    addUnit,
    updateUnit,
    deleteUnit,
    addFloor,
    updateFloor,
    deleteFloor,
    addRoom,
    updateRoom,
    deleteRoom,
    addTariff,
    updateTariff,
    deleteTariff,
    addScenario,
    updateScenario,
    deleteScenario,
    addPerson,
    updatePerson,
    deletePerson,
    addContract,
    updateContract,
    deleteContract,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
