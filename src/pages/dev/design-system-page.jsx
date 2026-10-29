import { LayoutGrid, MoreHorizontal, PanelLeft, SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { FormField } from "@/components/forms/form-field";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/*
 * Development-only gallery of the design system. It is registered only when
 * import.meta.env.DEV is true, so it is not part of production builds.
 * All data on this page is placeholder content for visual review.
 */

const BASE = "/dev/design-system";

const tokens = [
  { name: "primary", className: "bg-primary", value: "#344EEE" },
  { name: "primary-subtle", className: "bg-primary-subtle", value: "#E8ECFF" },
  { name: "surface", className: "bg-surface", value: "#FFFFFF" },
  { name: "background", className: "bg-background", value: "#F8FAFC" },
  { name: "foreground", className: "bg-foreground", value: "#111827" },
  { name: "muted-foreground", className: "bg-muted-foreground", value: "#6B7280" },
  { name: "border", className: "bg-border", value: "#E5E7EB" },
  { name: "success", className: "bg-success", value: "#16A34A" },
  { name: "destructive", className: "bg-destructive", value: "#DC2626" },
];

const sampleRows = [
  { name: "Sample row A", status: "Complete", variant: "success", date: "2026-01-05" },
  { name: "Sample row B", status: "In progress", variant: "default", date: "2026-01-04" },
  { name: "Sample row C", status: "Failed", variant: "destructive", date: "2026-01-03" },
];

function Showcase({ title, children }) {
  return (
    <section className="space-y-4" aria-label={title}>
      <h2 className="text-heading">{title}</h2>
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">{children}</div>
    </section>
  );
}

function ComponentGallery() {
  const [selectValue, setSelectValue] = useState("");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Design system"
        description="Development-only reference for PrepWise UI components and tokens."
        actions={
          <Button asChild variant="outline">
            <Link to={`${BASE}/app-shell`}>
              <PanelLeft aria-hidden="true" />
              App shell preview
            </Link>
          </Button>
        }
      />

      <Showcase title="Colour tokens">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tokens.map((token) => (
            <li key={token.name} className="space-y-2">
              <div className={`h-12 rounded-md border border-border ${token.className}`} />
              <p className="text-sm font-medium">{token.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{token.value}</p>
            </li>
          ))}
        </ul>
      </Showcase>

      <Showcase title="Typography">
        <div className="space-y-3">
          <p className="text-display">Display heading</p>
          <p className="text-title">Page title</p>
          <p className="text-heading">Section heading</p>
          <p className="text-body">Body text for paragraphs and descriptions.</p>
          <p className="text-sm text-muted-foreground">Secondary text for supporting details.</p>
        </div>
      </Showcase>

      <Showcase title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button isLoading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Grid view">
            <LayoutGrid aria-hidden="true" />
          </Button>
        </div>
      </Showcase>

      <Showcase title="Form controls">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="ds-name" label="Text input" description="Helper text appears here.">
            {(props) => <Input placeholder="Placeholder" {...props} />}
          </FormField>
          <FormField id="ds-error" label="Input with error" error="This field is required.">
            {(props) => <Input {...props} />}
          </FormField>
          <div className="grid gap-2">
            <span className="text-sm font-medium" id="ds-select-label">
              Select
            </span>
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger aria-labelledby="ds-select-label">
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one">Option one</SelectItem>
                <SelectItem value="two">Option two</SelectItem>
                <SelectItem value="three">Option three</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FormField id="ds-disabled" label="Disabled input">
            {(props) => <Input disabled value="Not editable" readOnly {...props} />}
          </FormField>
          <FormField id="ds-textarea" label="Textarea" className="md:col-span-2">
            {(props) => <Textarea placeholder="Longer text" {...props} />}
          </FormField>
        </div>
      </Showcase>

      <Showcase title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="solid">Solid</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      </Showcase>

      <Showcase title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Supporting description text.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Card body content.</CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <CardSkeleton />
        </div>
      </Showcase>

      <Showcase title="Dialog and dropdown">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>
                  Focus is trapped inside the dialog. Press Escape to close it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Confirm</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>First item</DropdownMenuItem>
              <DropdownMenuItem>Second item</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Destructive item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Showcase>

      <Showcase title="Tabs">
        <Tabs defaultValue="first">
          <TabsList>
            <TabsTrigger value="first">First</TabsTrigger>
            <TabsTrigger value="second">Second</TabsTrigger>
            <TabsTrigger value="third">Third</TabsTrigger>
          </TabsList>
          <TabsContent value="first" className="text-sm">
            First panel. Use arrow keys to move between tabs.
          </TabsContent>
          <TabsContent value="second" className="text-sm">
            Second panel.
          </TabsContent>
          <TabsContent value="third" className="text-sm">
            Third panel.
          </TabsContent>
        </Tabs>
      </Showcase>

      <Showcase title="Table">
        <Table>
          <TableCaption>Placeholder rows for layout review.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <Badge variant={row.variant}>{row.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Showcase>

      <Showcase title="Loading, empty, and error states">
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingState label="Loading data" />
          <EmptyState
            icon={SearchX}
            title="Nothing here yet"
            description="Empty states explain what will appear and how to add it."
          />
          <div className="space-y-4">
            <ErrorMessage
              message="The request failed. Check your connection."
              onRetry={() => {}}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Inline spinner
            </div>
          </div>
        </div>
      </Showcase>
    </div>
  );
}

const shellNavItems = [
  { to: BASE, label: "Components", icon: LayoutGrid, end: true },
  { to: `${BASE}/app-shell`, label: "App shell", icon: PanelLeft },
];

function DesignSystemPage() {
  const params = useParams();
  const showShell = params["*"] === "app-shell";

  if (showShell) {
    return (
      <>
        <DocumentTitle title="App shell preview" />
        <AppShell navItems={shellNavItems} homeTo={BASE}>
          <PageHeader
            title="App shell"
            description="Sidebar on large screens, slide-in menu below 1024px."
          />
          <EmptyState
            className="mt-8"
            title="Page content area"
            description="Authenticated pages render their content here inside a PageContainer."
          />
        </AppShell>
      </>
    );
  }

  return (
    <>
      <DocumentTitle title="Design system" />
      <main id="main-content" tabIndex={-1} className="py-10 outline-none">
        <PageContainer>
          <ComponentGallery />
        </PageContainer>
      </main>
    </>
  );
}

export default DesignSystemPage;
