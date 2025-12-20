// Re-export all UI components
// Named exports from shadcn/ui components
export { Button, buttonVariants } from './button'
export { Input } from './input'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Label } from './label'
export { Badge, badgeVariants } from './badge'
export { Separator } from './separator'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger } from './sheet'
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from './dialog'
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from './select'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Switch } from './switch'
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover'
export { Textarea } from './textarea'
export { Checkbox } from './checkbox'
export { Progress } from './progress'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Skeleton } from './skeleton'
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu'

// Default exports for backward compatibility with existing code
// This allows both `import Button from './ui/Button'` and `import { Button } from './ui'`
import { Button } from './button'
import { Input } from './input'

export default {
  Button,
  Input,
}

// State Components (UX Completion)
export { default as EmptyState, type EmptyStateVariant } from './EmptyState';
export { default as ErrorState, type ErrorStateVariant } from './ErrorState';
export { default as AccessDenied } from './AccessDenied';
