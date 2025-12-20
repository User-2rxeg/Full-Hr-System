'use client';

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "../../lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10",
        success:
          "border-success/50 text-success dark:border-success [&>svg]:text-success bg-success/10",
        warning:
          "border-warning/50 text-warning dark:border-warning [&>svg]:text-warning bg-warning/10",
        info:
          "border-info/50 text-info dark:border-info [&>svg]:text-info bg-info/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & {
    dismissible?: boolean
    onDismiss?: () => void
  }
>(({ className, variant, dismissible = false, onDismiss, children, ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// Helper component for predefined alert types
interface PredefinedAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description: string
  dismissible?: boolean
  onDismiss?: () => void
}

const SuccessAlert = React.forwardRef<HTMLDivElement, PredefinedAlertProps>(
  ({ title = "Success", description, dismissible, onDismiss, className, ...props }, ref) => (
    <Alert
      ref={ref}
      variant="success"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={cn("animate-in fade-in duration-300", className)}
      {...props}
    >
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
)
SuccessAlert.displayName = "SuccessAlert"

const ErrorAlert = React.forwardRef<HTMLDivElement, PredefinedAlertProps>(
  ({ title = "Error", description, dismissible, onDismiss, className, ...props }, ref) => (
    <Alert
      ref={ref}
      variant="destructive"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={cn("animate-in fade-in duration-300", className)}
      {...props}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
)
ErrorAlert.displayName = "ErrorAlert"

const WarningAlert = React.forwardRef<HTMLDivElement, PredefinedAlertProps>(
  ({ title = "Warning", description, dismissible, onDismiss, className, ...props }, ref) => (
    <Alert
      ref={ref}
      variant="warning"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={cn("animate-in fade-in duration-300", className)}
      {...props}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
)
WarningAlert.displayName = "WarningAlert"

const InfoAlert = React.forwardRef<HTMLDivElement, PredefinedAlertProps>(
  ({ title = "Information", description, dismissible, onDismiss, className, ...props }, ref) => (
    <Alert
      ref={ref}
      variant="info"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={cn("animate-in fade-in duration-300", className)}
      {...props}
    >
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
)
InfoAlert.displayName = "InfoAlert"

export {
  Alert,
  AlertTitle,
  AlertDescription,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
}