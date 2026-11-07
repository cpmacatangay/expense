import { createComponent } from '@lit/react'
import * as React from 'react'
import { MdFilledButton } from '@material/web/button/filled-button.js'
import { MdFilledTonalButton } from '@material/web/button/filled-tonal-button.js'
import { MdOutlinedButton } from '@material/web/button/outlined-button.js'
import { MdTextButton } from '@material/web/button/text-button.js'
import { MdElevatedButton } from '@material/web/button/elevated-button.js'
import { MdCheckbox } from '@material/web/checkbox/checkbox.js'
import { MdDialog } from '@material/web/dialog/dialog.js'
import { MdFab } from '@material/web/fab/fab.js'
import { MdIcon } from '@material/web/icon/icon.js'
import { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js'
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js'
import { MdSelectOption } from '@material/web/select/select-option.js'
import { MdLinearProgress } from '@material/web/progress/linear-progress.js'
import { MdCircularProgress } from '@material/web/progress/circular-progress.js'
import { MdFilterChip } from '@material/web/chips/filter-chip.js'
import { MdIconButton } from '@material/web/iconbutton/icon-button.js'
import { MdNavigationBar } from '@material/web/labs/navigationbar/navigation-bar.js'
import { MdNavigationTab } from '@material/web/labs/navigationtab/navigation-tab.js'
import { MdFilledCard } from '@material/web/labs/card/filled-card.js'
import { MdOutlinedCard } from '@material/web/labs/card/outlined-card.js'
import { MdElevatedCard } from '@material/web/labs/card/elevated-card.js'
import clsx from 'clsx'

const FilledButton = createComponent({
  tagName: 'md-filled-button',
  elementClass: MdFilledButton,
  react: React,
  events: { onClick: 'click' }
})
const TonalButton = createComponent({
  tagName: 'md-filled-tonal-button',
  elementClass: MdFilledTonalButton,
  react: React,
  events: { onClick: 'click' }
})
const OutlinedButton = createComponent({
  tagName: 'md-outlined-button',
  elementClass: MdOutlinedButton,
  react: React,
  events: { onClick: 'click' }
})
const TextButton = createComponent({
  tagName: 'md-text-button',
  elementClass: MdTextButton,
  react: React,
  events: { onClick: 'click' }
})
const ElevatedButton = createComponent({
  tagName: 'md-elevated-button',
  elementClass: MdElevatedButton,
  react: React,
  events: { onClick: 'click' }
})

const TextField = createComponent({
  tagName: 'md-outlined-text-field',
  elementClass: MdOutlinedTextField,
  react: React,
  events: { onInput: 'input' }
})
const SelectField = createComponent({
  tagName: 'md-outlined-select',
  elementClass: MdOutlinedSelect,
  react: React,
  events: { onChange: 'change' }
})
const SelectOption = createComponent({
  tagName: 'md-select-option',
  elementClass: MdSelectOption,
  react: React
})
const CheckboxField = createComponent({
  tagName: 'md-checkbox',
  elementClass: MdCheckbox,
  react: React,
  events: { onChange: 'change' }
})
const DialogElement = createComponent({
  tagName: 'md-dialog',
  elementClass: MdDialog,
  react: React,
  events: { onClosed: 'closed', onCancel: 'cancel' }
})
const FilledCard = createComponent({
  tagName: 'md-filled-card',
  elementClass: MdFilledCard,
  react: React
})
const OutlinedCard = createComponent({
  tagName: 'md-outlined-card',
  elementClass: MdOutlinedCard,
  react: React
})
const ElevatedCard = createComponent({
  tagName: 'md-elevated-card',
  elementClass: MdElevatedCard,
  react: React
})
const FabElement = createComponent({
  tagName: 'md-fab',
  elementClass: MdFab,
  react: React,
  events: { onClick: 'click' }
})
const IconElement = createComponent({
  tagName: 'md-icon',
  elementClass: MdIcon,
  react: React
})
const IconButtonElement = createComponent({
  tagName: 'md-icon-button',
  elementClass: MdIconButton,
  react: React,
  events: { onClick: 'click' }
})
const LinearProgressElement = createComponent({
  tagName: 'md-linear-progress',
  elementClass: MdLinearProgress,
  react: React
})
const CircularProgressElement = createComponent({
  tagName: 'md-circular-progress',
  elementClass: MdCircularProgress,
  react: React
})
const FilterChipElement = createComponent({
  tagName: 'md-filter-chip',
  elementClass: MdFilterChip,
  react: React,
  events: { onClick: 'click' }
})
const NavigationBarElement = createComponent({
  tagName: 'md-navigation-bar',
  elementClass: MdNavigationBar,
  react: React
})
const NavigationTabElement = createComponent({
  tagName: 'md-navigation-tab',
  elementClass: MdNavigationTab,
  react: React,
  events: { onClick: 'click' }
})

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'amber'
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'elevated'
  | 'on-primary-container'

type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonComponentProps = React.ComponentProps<typeof FilledButton>

export interface ButtonProps extends ButtonComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const buttonComponents = {
  primary: FilledButton,
  filled: FilledButton,
  secondary: OutlinedButton,
  outlined: OutlinedButton,
  ghost: TextButton,
  text: TextButton,
  elevated: ElevatedButton,
  amber: TonalButton,
  tonal: TonalButton,
  danger: FilledButton,
  'on-primary-container': OutlinedButton
} as unknown as Record<ButtonVariant, React.ComponentType<ButtonComponentProps>>

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  style,
  ...props
}: ButtonProps) {
  const Component = buttonComponents[variant]

  return (
    <Component
      {...props}
      className={clsx(
        size === 'sm' && 'm3-button-compact',
        size === 'lg' && 'm3-button-large',
        variant === 'danger' && 'm3-error-button',
        variant === 'on-primary-container' && 'm3-on-primary-container-button',
        fullWidth && 'w-full',
        className
      )}
      style={{ ...(fullWidth ? { width: '100%' } : {}), ...style }}
    />
  )
}

type TextFieldComponentProps = React.ComponentProps<typeof TextField> & React.AriaAttributes

export interface TextFieldProps extends Omit<TextFieldComponentProps, 'onChange'> {
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: string) => void
}

export function Input({
  className,
  onChange,
  onValueChange,
  style,
  ...props
}: TextFieldProps) {
  return (
    <TextField
      {...props}
      className={clsx('w-full', className)}
      style={{ width: '100%', ...style }}
      onInput={(event: Event) => {
        const value = (event.currentTarget as MdOutlinedTextField).value
        onValueChange?.(value)
        onChange?.({ target: { value } } as unknown as React.ChangeEvent<HTMLInputElement>)
      }}
    />
  )
}

export function Textarea(props: TextFieldProps) {
  return <Input {...props} type="textarea" rows={props.rows ?? 4} />
}

export interface SelectOptionItem {
  value: string
  label: string
  disabled?: boolean
}

type SelectComponentProps = React.ComponentProps<typeof SelectField> & React.AriaAttributes

export interface SelectProps extends Omit<SelectComponentProps, 'onChange' | 'children' | 'options'> {
  options: SelectOptionItem[]
  placeholder?: string
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
}

export function Select({
  options,
  placeholder,
  className,
  onChange,
  style,
  ...props
}: SelectProps) {
  return (
    <SelectField
      {...props}
      className={clsx('w-full', className)}
      style={{ width: '100%', ...style }}
      onChange={(event: Event) => {
        const value = (event.currentTarget as MdOutlinedSelect).value
        onChange?.({ target: { value } } as unknown as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      {placeholder ? (
        <SelectOption value="">
          <div slot="headline">{placeholder}</div>
        </SelectOption>
      ) : null}
      {options.map((option) => (
        <SelectOption key={option.value} value={option.value} disabled={option.disabled}>
          <div slot="headline">{option.label}</div>
        </SelectOption>
      ))}
    </SelectField>
  )
}

export interface CheckboxProps {
  label: React.ReactNode
  checked?: boolean
  disabled?: boolean
  className?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
}

export function Checkbox({ label, checked, disabled, className, onChange }: CheckboxProps) {
  return (
    <label
      className={clsx(
        'm3-body-medium flex cursor-pointer items-center gap-3 rounded-m3-sm border border-outline-variant bg-surface-container-lowest px-3 py-3 hover:bg-surface-container-low',
        className
      )}
    >
      <CheckboxField
        checked={checked}
        disabled={disabled}
        onChange={(event: Event) => {
          const isChecked = (event.currentTarget as MdCheckbox).checked
          onChange?.({
            target: { checked: isChecked }
          } as unknown as React.ChangeEvent<HTMLInputElement>)
        }}
      />
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  )
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = React.useRef<MdDialog>(null)

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.show()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <DialogElement
      ref={ref}
      className="m3-dialog"
      onClosed={onClose}
      onCancel={onClose}
    >
      <div slot="headline" className="m3-headline-small px-6 pt-6">
        {title}
      </div>
      <div
        slot="content"
        className={clsx(
          'm3-body-medium px-6 pt-4 text-on-surface-variant',
          footer ? 'pb-2' : 'pb-6'
        )}
      >
        {description ? <p className="mb-4">{description}</p> : null}
        {children}
      </div>
      {footer ? (
        <div slot="actions" className="flex justify-end gap-2 px-6 pb-6 pt-2">
          {footer}
        </div>
      ) : null}
    </DialogElement>
  )
}

type CardVariant = 'filled' | 'elevated' | 'outlined' | 'primary'

type CardComponentProps = React.ComponentProps<typeof FilledCard>

export interface CardProps extends CardComponentProps {
  variant?: CardVariant
}

export function Card({ variant = 'filled', className, ...props }: CardProps) {
  const Component =
    variant === 'outlined' ? OutlinedCard : variant === 'elevated' ? ElevatedCard : FilledCard

  return (
    <Component
      {...props}
      className={clsx(
        'block p-5',
        variant === 'primary' && 'm3-primary-card',
        className
      )}
    />
  )
}

export function Icon({
  children,
  className,
  ...props
}: React.ComponentProps<typeof IconElement>) {
  return (
    <IconElement className={className} aria-hidden="true" {...props}>
      {children}
    </IconElement>
  )
}

export function IconButton({
  className,
  ...props
}: React.ComponentProps<typeof IconButtonElement> & React.AriaAttributes) {
  return <IconButtonElement className={className} {...props} />
}

export interface FabProps extends React.ComponentProps<typeof FabElement> {
  label: string
}

export function Fab({ label, className, children, ...props }: FabProps) {
  return (
    <FabElement {...props} label={label} className={className}>
      {children}
    </FabElement>
  )
}

export function LinearProgress({
  className,
  ...props
}: React.ComponentProps<typeof LinearProgressElement>) {
  return (
    <LinearProgressElement
      {...props}
      className={clsx('w-full', className)}
      style={{ width: '100%' }}
    />
  )
}

export function CircularProgress({
  className,
  ...props
}: React.ComponentProps<typeof CircularProgressElement>) {
  return <CircularProgressElement {...props} className={className} />
}

export interface FilterChipProps extends React.ComponentProps<typeof FilterChipElement> {
  label: string
}

export function FilterChip({ label, ...props }: FilterChipProps) {
  return <FilterChipElement {...props} label={label} />
}

export function NavigationBar({
  className,
  ...props
}: React.ComponentProps<typeof NavigationBarElement>) {
  return (
    <NavigationBarElement
      {...props}
      className={clsx('w-full', className)}
      style={{ width: '100%' }}
    />
  )
}

export interface NavigationTabProps extends React.ComponentProps<typeof NavigationTabElement> {
  label: string
}

export function NavigationTab({ label, ...props }: NavigationTabProps) {
  return <NavigationTabElement {...props} label={label} />
}
