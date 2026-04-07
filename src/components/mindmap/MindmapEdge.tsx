import { motion } from 'framer-motion';
import type { LayoutEdge } from './hooks/useTreeLayout';

interface MindmapEdgeProps {
  edge: LayoutEdge;
}

const MindmapEdge = ({ edge }: MindmapEdgeProps) => {
  const { sourceX, sourceY, targetX, targetY, sourceNode, targetNode } = edge;
  const curveOffset = (targetX - sourceX) * 0.4;

  const d = `M ${sourceX} ${sourceY} C ${sourceX + curveOffset} ${sourceY}, ${targetX - curveOffset} ${targetY}, ${targetX} ${targetY}`;

  const bothCompleted = sourceNode.completed && targetNode.completed;

  return (
    <motion.path
      d={d}
      stroke={bothCompleted ? '#e5e7eb' : '#d1d5db'}
      strokeWidth={1.5}
      fill="none"
      opacity={bothCompleted ? 0.5 : 1}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: bothCompleted ? 0.5 : 1 }}
      transition={{ duration: 0.3 }}
    />
  );
};

export default MindmapEdge;
