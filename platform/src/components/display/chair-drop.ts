import { chairAcceptsDrop, type StylistWaitKind } from "@/lib/display-schedule";

export type ChairDrag = {
  apptId: string;
  stylistId: string;
  stylistName: string;
  label: string;
  x: number;
  y: number;
  overStylistId: string | null;
};

export function hitChairDrop(x: number, y: number) {
  const el = document.elementFromPoint(x, y);
  const drop = el?.closest("[data-chair-drop]") as HTMLElement | null;
  if (!drop) return null;
  const kind = (drop.dataset.chairKind || "waiting") as StylistWaitKind;
  return { id: drop.dataset.chairDrop || "", name: drop.dataset.chairName || "", kind };
}

export function resolveDropTarget(
  hit: { id: string; kind: StylistWaitKind } | null,
  sourceStylistId: string
) {
  if (!hit?.id) return null;
  if (!chairAcceptsDrop(hit.kind, hit.id === sourceStylistId)) return null;
  return hit.id;
}
