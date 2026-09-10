import { NodeType } from "../types";

export const NODE_COLORS: Record<NodeType, string> = {
  member: "#FF7071",
  event: "#2B3AF3",
  domain: "#6F2982",
  project: "#B56B45",
  policy: "#E84855",
};

export const NODE_BG_COLORS: Record<NodeType, string> = {
  member: "rgba(255, 112, 113, 0.15)",
  event: "rgba(43, 58, 243, 0.15)",
  domain: "rgba(111, 41, 130, 0.2)",
  project: "rgba(181, 107, 69, 0.15)",
  policy: "rgba(232, 72, 85, 0.15)",
};

export const NODE_BORDER_COLORS: Record<NodeType, string> = {
  member: "rgba(255, 112, 113, 0.6)",
  event: "rgba(43, 58, 243, 0.6)",
  domain: "rgba(111, 41, 130, 0.6)",
  project: "rgba(181, 107, 69, 0.6)",
  policy: "rgba(232, 72, 85, 0.6)",
};

export const NODE_LABELS: Record<NodeType, string> = {
  member: "Member",
  event: "Event",
  domain: "Domain",
  project: "Project",
  policy: "Policy",
};
