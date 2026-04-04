'use client'

import React, { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useAgentStore } from '@/store/agentStore'
import { useNeuralMapStore } from '@/store/neuralMapStore'
import { useA2AStore } from '@/store/a2aStore'
import AgentNode from './AgentNode'
import A2AEdge from './A2AEdge'
import MapControls from './MapControls'
import NodeDetails from './NodeDetails'

const nodeTypes = {
  agent: AgentNode,
}

const edgeTypes = {
  a2a: A2AEdge,
}

export default function NeuralMap() {
  const { agents, fetchAgents } = useAgentStore()
  const { a2aMessages } = useA2AStore()
  const { selectedNode, setSelectedNode } = useNeuralMapStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetchAgents()
  }, [fetchAgents])

  // Convert agents to React Flow nodes
  const [nodes, setNodes, onNodesChange] = useNodesState(
    agents.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: {
        x: (index % 4) * 250,
        y: Math.floor(index / 4) * 200,
      },
      data: {
        label: agent.name,
        status: agent.status,
        model: agent.model,
        memoryUsage: agent.memoryUsage,
        lastActive: agent.lastActive,
      },
    }))
  )

  // Convert A2A messages to animated edges
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    a2aMessages
      .filter((msg): msg is typeof msg & { to: string } => !!msg.to && !!msg.from)
      .map((msg, index) => ({
        id: `edge-${msg.from}-${msg.to}-${index}`,
        source: msg.from,
        target: msg.to,
        type: 'a2a',
        animated: true,
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        data: {
          traceId: msg.traceId,
          messageType: msg.type,
          latency: msg.latency,
          timestamp: msg.timestamp,
        },
      }))
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  if (!isClient) {
    return (
      <div className="w-full h-[800px] cyber-card flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">
          Initializing Neural Map...
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[800px] cyber-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-gray-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#0891b2"
        />
        <Controls className="bg-gray-900 border-cyan-800" />
        <MapControls />
      </ReactFlow>
      {selectedNode && <NodeDetails nodeId={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  )
}
