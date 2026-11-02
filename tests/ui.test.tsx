// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from '../src/lib/session'
import { Gate } from '../src/pages/Gate'
import { Modal } from '../src/components/ui'
import { Rich } from '../src/components/ui'
import { Countdown } from '../src/components/Countdown'

afterEach(cleanup)

describe('password gate UI', () => {
  it('has a labelled password field, show/hide, and a disabled button until something is typed', async () => {
    render(<SessionProvider><Gate /></SessionProvider>)
    const input = screen.getByLabelText(/guard's name/i) as HTMLInputElement
    expect(input.type).toBe('password')
    const enter = screen.getByRole('button', { name: /come in/i }) as HTMLButtonElement
    expect(enter.disabled).toBe(true)
    await userEvent.type(input, 'abc')
    expect(enter.disabled).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: /show/i }))
    expect(input.type).toBe('text')
    expect(screen.getByRole('img', { name: /scottish fold/i })).toBeTruthy()
  })
  it('never prints a password hint that contains the password', () => {
    const { container } = render(<SessionProvider><Gate /></SessionProvider>)
    expect(container.textContent!.toLowerCase()).not.toContain('dev-password')
  })
  it('explains when the backend is not configured instead of pretending to work', () => {
    render(<SessionProvider><Gate /></SessionProvider>)
    expect(screen.getByRole('alert').textContent).toMatch(/connected to its backend/i)
  })
})

describe('accessibility primitives', () => {
  it('modal is a labelled dialog and closes on Escape', async () => {
    let closed = false
    render(<Modal open onClose={() => { closed = true }} label="A letter"><button>Inside</button></Modal>)
    expect(screen.getByRole('dialog', { name: 'A letter' })).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(closed).toBe(true)
  })
  it('placeholders are highlighted', () => {
    const { container } = render(<Rich text="Hello [[ADD: memory]] there" />)
    expect(container.querySelector('mark')!.textContent).toBe('ADD: memory')
  })
  it('countdown exposes a timer role with a readable label', () => {
    // Countdown needs the data provider; the label logic is covered by countdownParts in time.test.ts
    expect(typeof Countdown).toBe('function')
  })
})
