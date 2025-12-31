'use client'

import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { TeamProjectAccessButton } from '@/components/TeamProjectAccessButton'

export function DashboardActionButtons() {
  return (
    <div className="flex gap-3">
      <Link
        href="/dashboard/student/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Plus className="w-5 h-5" />
        새 프로젝트 생성
      </Link>
      <TeamProjectAccessButton />
    </div>
  )
}

