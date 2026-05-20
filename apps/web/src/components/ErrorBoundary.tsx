import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <div className="text-center space-y-4 p-8">
            <h2 className="text-xl font-semibold text-[var(--text-main)]">Đã xảy ra lỗi không mong đợi</h2>
            <p className="text-sm text-[var(--text-sub)]">Vui lòng tải lại trang hoặc liên hệ quản trị viên.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[var(--accent-cyan)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
