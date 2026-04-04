'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const availableSkills = [
  { id: 'web-search', name: 'Web Search', description: 'Search the web for real-time information', category: 'Research', installed: true },
  { id: 'code-exec', name: 'Code Executor', description: 'Execute Python/JavaScript code snippets', category: 'Development', installed: true },
  { id: 'file-system', name: 'File System', description: 'Read/write files on the local filesystem', category: 'System', installed: false },
  { id: 'image-gen', name: 'Image Generator', description: 'Generate images from text descriptions', category: 'Creative', installed: false },
  { id: 'sentiment', name: 'Sentiment Analysis', description: 'Analyze text sentiment and emotions', category: 'NLP', installed: false },
  { id: 'translation', name: 'Translation', description: 'Translate text between languages', category: 'NLP', installed: true },
]

export default function SkillStore() {
  const [searchQuery, setSearchQuery] = useState('')
  const [skills, setSkills] = useState(availableSkills)

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleInstall = (id: string) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === id ? { ...skill, installed: !skill.installed } : skill
      )
    )
  }

  return (
    <Card
      title="Skill Store"
      description="Browse and install plugins/skills for agents"
    >
      <div className="mb-4">
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-mono text-cyan-100">{skill.name}</h4>
                <Badge variant="info" className="mt-1">
                  {skill.category}
                </Badge>
              </div>
              <Badge variant={skill.installed ? 'success' : 'default'}>
                {skill.installed ? 'Installed' : 'Available'}
              </Badge>
            </div>

            <p className="text-sm text-gray-400 mb-4">{skill.description}</p>

            <Button
              variant={skill.installed ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => toggleInstall(skill.id)}
              className="w-full"
            >
              {skill.installed ? 'Uninstall' : 'Install'}
            </Button>
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-8 text-gray-500 font-mono">
          No skills found matching "{searchQuery}"
        </div>
      )}
    </Card>
  )
}
