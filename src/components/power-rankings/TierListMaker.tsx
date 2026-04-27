"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PRTeam } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";
import { POOL_ID, type Tier } from "@/lib/tierlist";
import { useTierList } from "@/hooks/useTierList";

interface Props {
  teams: PRTeam[];
}

export default function TierListMaker({ teams }: Props) {
  const rosterIds = useMemo(() => teams.map((t) => t.roster_id), [teams]);
  const teamMap = useMemo(() => {
    const m = new Map<number, PRTeam>();
    teams.forEach((t) => m.set(t.roster_id, t));
    return m;
  }, [teams]);

  const {
    state,
    addTier,
    deleteTier,
    moveTier,
    renameTier,
    recolorTier,
    placeTeam,
    reset,
  } = useTierList(rosterIds);

  const placedIds = useMemo(() => {
    const set = new Set<number>();
    state.tiers.forEach((t) => t.rosterIds.forEach((id) => set.add(id)));
    return set;
  }, [state.tiers]);

  const poolIds = useMemo(
    () => rosterIds.filter((id) => !placedIds.has(id)),
    [rosterIds, placedIds],
  );

  const [activeId, setActiveId] = useState<number | null>(null);
  const [showNames, setShowNames] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function findContainer(rosterId: number): string {
    const tier = state.tiers.find((t) => t.rosterIds.includes(rosterId));
    return tier ? tier.id : POOL_ID;
  }

  // Custom multi-container collision detection.
  // Prefer the container the pointer is literally inside; if that container
  // has sortable items, refine to the closest item so we get an insertion
  // index. This stops the source item from "chasing the cursor" inside the
  // pool and makes pool→tier drops resolve to the tier even when the cursor
  // crosses pool items en route.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerHits = pointerWithin(args);
      const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
      const overId = getFirstCollision(hits, "id");
      if (overId == null) return [];

      // If we're over a tier container, refine to the nearest sortable item
      // inside that tier so handleDragEnd gets an insertion index.
      const overTier = state.tiers.find((t) => t.id === overId);
      if (overTier && overTier.rosterIds.length > 0) {
        const itemIds = new Set(overTier.rosterIds.map(String));
        const inner = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) =>
            itemIds.has(String(c.id)),
          ),
        });
        const innerId = getFirstCollision(inner, "id");
        if (innerId != null) return [{ id: innerId }];
      }

      return [{ id: overId }];
    },
    [state.tiers],
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const rosterId = Number(active.id);
    const overId = String(over.id);

    // Direct drop on a container (empty tier or pool).
    if (overId === POOL_ID) {
      placeTeam(rosterId, null);
      return;
    }
    const overTier = state.tiers.find((t) => t.id === overId);
    if (overTier) {
      placeTeam(rosterId, overTier.id);
      return;
    }

    // Otherwise overId is another roster id → drop next to that team.
    const overRoster = Number(overId);
    if (Number.isNaN(overRoster)) return;

    const sourceContainer = findContainer(rosterId);
    const targetContainer = findContainer(overRoster);

    if (targetContainer === POOL_ID) {
      if (sourceContainer === POOL_ID) return; // pool order is auto-derived
      placeTeam(rosterId, null);
      return;
    }

    const targetTier = state.tiers.find((t) => t.id === targetContainer);
    if (!targetTier) return;
    const targetIndex = targetTier.rosterIds.indexOf(overRoster);
    if (targetIndex === -1) {
      placeTeam(rosterId, targetTier.id);
      return;
    }
    placeTeam(rosterId, targetTier.id, targetIndex);
  }

  const activeTeam = activeId !== null ? teamMap.get(activeId) ?? null : null;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Tier List</h2>
          <p className="text-xs text-text-secondary">
            Drag teams into a tier. Tiers expand vertically as they fill up.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNames((v) => !v)}
            aria-pressed={showNames}
            className={`text-xs px-2.5 py-1 rounded border border-border hover:bg-bg-hover hover:text-text-primary ${
              showNames
                ? "bg-bg-hover text-text-primary"
                : "text-text-secondary"
            }`}
          >
            {showNames ? "Hide names" : "Show names"}
          </button>
          <button
            type="button"
            onClick={addTier}
            className="text-xs px-2.5 py-1 rounded border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            + Add tier
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-xs px-2.5 py-1 rounded border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            Reset
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1.5">
          {state.tiers.map((tier, idx) => (
            <TierRow
              key={tier.id}
              tier={tier}
              teams={tier.rosterIds
                .map((id) => teamMap.get(id))
                .filter((t): t is PRTeam => Boolean(t))}
              isFirst={idx === 0}
              isLast={idx === state.tiers.length - 1}
              showNames={showNames}
              onRename={(label) => renameTier(tier.id, label)}
              onRecolor={(color) => recolorTier(tier.id, color)}
              onMoveUp={() => moveTier(tier.id, "up")}
              onMoveDown={() => moveTier(tier.id, "down")}
              onDelete={() => deleteTier(tier.id)}
            />
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <div className="text-xs uppercase tracking-wide text-text-muted mb-2">
            Unranked
          </div>
          <TeamPool
            teams={poolIds
              .map((id) => teamMap.get(id))
              .filter((t): t is PRTeam => Boolean(t))}
            showNames={showNames}
          />
        </div>

        <DragOverlay>
          {activeTeam ? (
            <TeamLogo team={activeTeam} dragging showName={showNames} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface TierRowProps {
  tier: Tier;
  teams: PRTeam[];
  isFirst: boolean;
  isLast: boolean;
  showNames: boolean;
  onRename: (label: string) => void;
  onRecolor: (color: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function TierRow({
  tier,
  teams,
  isFirst,
  isLast,
  showNames,
  onRename,
  onRecolor,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TierRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });

  return (
    <div className="flex border border-border rounded-md overflow-hidden bg-bg-primary/40">
      <div
        className="flex flex-col items-center justify-center w-20 shrink-0 px-2 py-2 gap-1.5"
        style={{ backgroundColor: tier.color }}
      >
        <input
          type="text"
          value={tier.label}
          onChange={(e) => onRename(e.target.value)}
          className="w-full bg-transparent text-center font-bold text-base text-black/85 outline-none focus:bg-black/10 rounded px-1"
          maxLength={12}
          aria-label="Tier label"
        />
        <label
          className="relative w-5 h-5 rounded-full border border-black/30 cursor-pointer overflow-hidden"
          style={{ backgroundColor: tier.color }}
          aria-label="Tier color"
        >
          <input
            type="color"
            value={tier.color}
            onChange={(e) => onRecolor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-16 p-2 transition-colors ${
          isOver ? "bg-bg-hover" : ""
        }`}
      >
        <SortableContext
          items={tier.rosterIds.map(String)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <SortableTeam key={t.roster_id} team={t} showName={showNames} />
            ))}
            {teams.length === 0 && (
              <span className="text-xs text-text-muted self-center pl-1">
                Drop teams here
              </span>
            )}
          </div>
        </SortableContext>
      </div>

      <div className="flex flex-col justify-center w-8 shrink-0 border-l border-border bg-bg-card">
        <ControlButton onClick={onMoveUp} disabled={isFirst} label="Move up">
          <ChevronUpIcon />
        </ControlButton>
        <ControlButton onClick={onMoveDown} disabled={isLast} label="Move down">
          <ChevronDownIcon />
        </ControlButton>
        <ControlButton onClick={onDelete} label="Delete tier">
          <TrashIcon />
        </ControlButton>
      </div>
    </div>
  );
}

function TeamPool({
  teams,
  showNames,
}: {
  teams: PRTeam[];
  showNames: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 rounded-md border border-dashed border-border p-2 transition-colors ${
        isOver ? "bg-bg-hover" : ""
      }`}
    >
      <div className="flex flex-wrap gap-2">
        {teams.map((t) => (
          <DraggableTeam key={t.roster_id} team={t} showName={showNames} />
        ))}
        {teams.length === 0 && (
          <span className="text-xs text-text-muted self-center pl-1">
            All teams placed
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableTeam({
  team,
  showName,
}: {
  team: PRTeam;
  showName: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(team.roster_id),
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TeamLogo team={team} showName={showName} />
    </div>
  );
}

function SortableTeam({
  team,
  showName,
}: {
  team: PRTeam;
  showName: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(team.roster_id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TeamLogo team={team} showName={showName} />
    </div>
  );
}

function TeamLogo({
  team,
  dragging,
  showName,
}: {
  team: PRTeam;
  dragging?: boolean;
  showName?: boolean;
}) {
  const url = avatarUrl(team.avatar);
  const initials = (team.owner_name || team.team_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      title={`${team.owner_name}${team.team_name ? ` — ${team.team_name}` : ""}`}
      className={`relative w-12 h-12 rounded-md border border-border bg-bg-hover overflow-hidden flex items-center justify-center select-none touch-none ${
        dragging ? "cursor-grabbing shadow-lg ring-2 ring-accent" : "cursor-grab"
      }`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={team.owner_name}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <span className="text-xs font-semibold text-text-secondary">
          {initials}
        </span>
      )}
      {showName && (
        <span
          className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[10px] leading-tight text-white pointer-events-none"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}
        >
          <span className="block w-full truncate">{team.owner_name}</span>
        </span>
      )}
    </div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ControlButton({ onClick, disabled, label, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex-1 min-h-0 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
    >
      {children}
    </button>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
