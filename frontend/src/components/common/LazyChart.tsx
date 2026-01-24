import { lazy, Suspense, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load Recharts components
const ResponsiveContainer = lazy(() => 
  import('recharts').then(m => ({ default: m.ResponsiveContainer }))
);
const AreaChart = lazy(() => 
  import('recharts').then(m => ({ default: m.AreaChart }))
);
const BarChart = lazy(() => 
  import('recharts').then(m => ({ default: m.BarChart }))
);
const LineChart = lazy(() => 
  import('recharts').then(m => ({ default: m.LineChart }))
);
const PieChart = lazy(() => 
  import('recharts').then(m => ({ default: m.PieChart }))
);
const Area = lazy(() => 
  import('recharts').then(m => ({ default: m.Area }))
);
const Bar = lazy(() => 
  import('recharts').then(m => ({ default: m.Bar }))
);
const Line = lazy(() => 
  import('recharts').then(m => ({ default: m.Line }))
);
const Pie = lazy(() => 
  import('recharts').then(m => ({ default: m.Pie }))
);
const Cell = lazy(() => 
  import('recharts').then(m => ({ default: m.Cell }))
);
const XAxis = lazy(() => 
  import('recharts').then(m => ({ default: m.XAxis }))
);
const YAxis = lazy(() => 
  import('recharts').then(m => ({ default: m.YAxis }))
);
const CartesianGrid = lazy(() => 
  import('recharts').then(m => ({ default: m.CartesianGrid }))
);
const Tooltip = lazy(() => 
  import('recharts').then(m => ({ default: m.Tooltip }))
);
const Legend = lazy(() => 
  import('recharts').then(m => ({ default: m.Legend }))
);

// Fallback loading component
const ChartLoading = () => (
  <div className="h-[300px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
  </div>
);

// Type definitions for props
interface ResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: React.ReactNode;
}

interface ChartProps {
  data?: any[];
  width?: number;
  height?: number;
  children?: React.ReactNode;
  [key: string]: any;
}

// Lazy wrapper components with Suspense
export const LazyResponsiveContainer = (props: ResponsiveContainerProps) => (
  <Suspense fallback={<ChartLoading />}>
    <ResponsiveContainer {...props} />
  </Suspense>
);

export const LazyAreaChart = (props: ChartProps) => (
  <Suspense fallback={<ChartLoading />}>
    <AreaChart {...props} />
  </Suspense>
);

export const LazyBarChart = (props: ChartProps) => (
  <Suspense fallback={<ChartLoading />}>
    <BarChart {...props} />
  </Suspense>
);

export const LazyLineChart = (props: ChartProps) => (
  <Suspense fallback={<ChartLoading />}>
    <LineChart {...props} />
  </Suspense>
);

export const LazyPieChart = (props: ChartProps) => (
  <Suspense fallback={<ChartLoading />}>
    <PieChart {...props} />
  </Suspense>
);

export const LazyArea = (props: any) => (
  <Suspense fallback={null}>
    <Area {...props} />
  </Suspense>
);

export const LazyBar = (props: any) => (
  <Suspense fallback={null}>
    <Bar {...props} />
  </Suspense>
);

export const LazyLine = (props: any) => (
  <Suspense fallback={null}>
    <Line {...props} />
  </Suspense>
);

export const LazyPie = (props: any) => (
  <Suspense fallback={null}>
    <Pie {...props} />
  </Suspense>
);

export const LazyCell = (props: any) => (
  <Suspense fallback={null}>
    <Cell {...props} />
  </Suspense>
);

export const LazyXAxis = (props: any) => (
  <Suspense fallback={null}>
    <XAxis {...props} />
  </Suspense>
);

export const LazyYAxis = (props: any) => (
  <Suspense fallback={null}>
    <YAxis {...props} />
  </Suspense>
);

export const LazyCartesianGrid = (props: any) => (
  <Suspense fallback={null}>
    <CartesianGrid {...props} />
  </Suspense>
);

export const LazyTooltip = (props: any) => (
  <Suspense fallback={null}>
    <Tooltip {...props} />
  </Suspense>
);

export const LazyLegend = (props: any) => (
  <Suspense fallback={null}>
    <Legend {...props} />
  </Suspense>
);

// Export all lazy components as default object for easy importing
export default {
  ResponsiveContainer: LazyResponsiveContainer,
  AreaChart: LazyAreaChart,
  BarChart: LazyBarChart,
  LineChart: LazyLineChart,
  PieChart: LazyPieChart,
  Area: LazyArea,
  Bar: LazyBar,
  Line: LazyLine,
  Pie: LazyPie,
  Cell: LazyCell,
  XAxis: LazyXAxis,
  YAxis: LazyYAxis,
  CartesianGrid: LazyCartesianGrid,
  Tooltip: LazyTooltip,
  Legend: LazyLegend,
};

