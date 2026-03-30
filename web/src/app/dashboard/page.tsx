import { redirect } from 'next/navigation'

export default function DashboardRedirect() {
  // Since the dashboard is actually a component on the root page, 
  // redirecting to / will show the dashboard if the user is logged in.
  redirect('/')
}
