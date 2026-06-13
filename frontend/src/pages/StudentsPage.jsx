import { useEffect, useState } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { useNotificationStore } from '../store'
import { studentService } from '../services/api'
import { Button, LoadingSpinner } from '../components/Common'
import { Edit3, Trash2 } from 'lucide-react'

export default function StudentsPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const response = await studentService.listStudents()
      setStudents(response.data.students || [])
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to load students',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedStudent(null)
    setFormData({ name: '', email: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      addNotification({ type: 'error', message: 'Name and email are required' })
      return
    }

    try {
      if (selectedStudent) {
        await studentService.updateStudent(selectedStudent.id, formData)
        addNotification({ type: 'success', message: 'Student updated successfully' })
      } else {
        await studentService.createStudent(formData)
        addNotification({ type: 'success', message: 'Student created successfully' })
      }
      await fetchStudents()
      resetForm()
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to save student',
      })
    }
  }

  const handleEdit = (student) => {
    setSelectedStudent(student)
    setFormData({ name: student.name, email: student.email })
  }

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete student ${student.name}?`)) {
      return
    }
    try {
      await studentService.deleteStudent(student.id)
      addNotification({ type: 'success', message: 'Student deleted successfully' })
      await fetchStudents()
      if (selectedStudent?.id === student.id) {
        resetForm()
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete student',
      })
    }
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Student Database</h1>
              <p className="text-slate-400 text-sm">Manage students and send VM information by email.</p>
            </div>
            <Button onClick={resetForm} variant="secondary" className="min-w-[170px]">
              {selectedStudent ? 'Create New Student' : 'Reset Form'}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Students</h2>
                  <p className="text-slate-400 text-sm">Create, update, and remove student records.</p>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-4 py-6 text-center text-slate-400">
                            No students found. Add one using the form.
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-900/70">
                            <td className="px-4 py-4">{student.name}</td>
                            <td className="px-4 py-4">{student.email}</td>
                            <td className="px-4 py-4 space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(student)}
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(student)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {selectedStudent ? 'Edit Student' : 'Add Student'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {selectedStudent
                    ? 'Update this student record and save changes.'
                    : 'Create a new student record with name and email.'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    value={formData.email}
                    onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                    type="email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. student@example.com"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" variant="primary" size="md">
                    {selectedStudent ? 'Save Changes' : 'Add Student'}
                  </Button>
                  {selectedStudent && (
                    <Button type="button" variant="secondary" size="md" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
