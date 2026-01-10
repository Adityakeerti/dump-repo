import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import StudentLogin from './pages/student_login'
import Dashboard from './pages/Dashboard'
import VBoard from './pages/VBoard'
import MeetingHub from './pages/MeetingHub'
import MeetingRoom from './pages/MeetingRoom'
import MessagesPage from './pages/MessagesPage'
import GroupsPage from './pages/GroupsPage'
import MarksheetPage from './pages/MarksheetPage'
import AcademicsPage from './pages/AcademicsPage'
import LibraryAdminDashboard from './pages/library/admin/Dashboard'
import MyBooks from './pages/library/student/MyBooks'
import LibrarianWorkstation from './pages/library/LibrarianWorkstation'
// Management Module Imports
import ManagementLogin from './pages/management_login'
import ManagementDashboard from './pages/management/Dashboard'
import ManagementWork from './pages/management/Work'
import ManagementLayout from './layouts/ManagementLayout'
import ProtectedManagementRoute from './components/ProtectedManagementRoute'
import ProtectedStudentRoute from './components/ProtectedStudentRoute'
import ProtectedRoute from './components/ProtectedRoute'  // Shared route for both student/management
import { useState } from 'react'

function App() {
    // Separate state for student and management auth (used by login components)
    const [studentAuthenticated, setStudentAuthenticated] = useState(false)
    const [managementAuthenticated, setManagementAuthenticated] = useState(false)

    return (
        <Router>
            <Routes>
                {/* Student Routes */}
                <Route
                    path="/student/login"
                    element={<StudentLogin setIsAuthenticated={setStudentAuthenticated} />}
                />
                <Route
                    path="/student/dashboard"
                    element={<ProtectedStudentRoute><Dashboard /></ProtectedStudentRoute>}
                />
                <Route path="/" element={<Navigate to="/student/login" />} />
                <Route
                    path="/student/vboard"
                    element={<ProtectedStudentRoute><VBoard /></ProtectedStudentRoute>}
                />
                <Route
                    path="/meeting"
                    element={<ProtectedRoute><MeetingHub /></ProtectedRoute>}
                />
                <Route
                    path="/meeting/room/:roomId"
                    element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>}
                />
                <Route
                    path="/messages"
                    element={<ProtectedRoute><MessagesPage /></ProtectedRoute>}
                />
                <Route
                    path="/groups"
                    element={<ProtectedRoute><GroupsPage /></ProtectedRoute>}
                />
                <Route
                    path="/marksheet"
                    element={<ProtectedStudentRoute><MarksheetPage /></ProtectedStudentRoute>}
                />
                <Route
                    path="/academics"
                    element={<ProtectedStudentRoute><AcademicsPage /></ProtectedStudentRoute>}
                />
                <Route
                    path="/student/library"
                    element={<ProtectedRoute><MyBooks /></ProtectedRoute>}
                />
                <Route
                    path="/library/admin"
                    element={<ProtectedRoute><LibraryAdminDashboard /></ProtectedRoute>}
                />

                {/* Management Routes */}
                <Route
                    path="/management/login"
                    element={<ManagementLogin setIsAuthenticated={setManagementAuthenticated} />}
                />
                <Route
                    path="/management/dashboard"
                    element={
                        <ProtectedManagementRoute>
                            <ManagementLayout>
                                <ManagementDashboard />
                            </ManagementLayout>
                        </ProtectedManagementRoute>
                    }
                />
                <Route
                    path="/management/library-workstation"
                    element={
                        <ProtectedManagementRoute>
                            <LibrarianWorkstation />
                        </ProtectedManagementRoute>
                    }
                />
                <Route
                    path="/management/work"
                    element={
                        <ProtectedManagementRoute>
                            <ManagementLayout>
                                <ManagementWork />
                            </ManagementLayout>
                        </ProtectedManagementRoute>
                    }
                />
            </Routes>
        </Router>
    )
}

export default App



