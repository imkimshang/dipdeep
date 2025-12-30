import { redirect } from 'next/navigation'

// Redirect to main dashboard - student dashboard is shown in /dashboard based on role
export default function StudentDashboardPage() {
  redirect('/dashboard')
}



