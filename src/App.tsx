import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  TrendingUp,
  Bell,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Star,
  MoreHorizontal,
  Filter,
  Download,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Progress } from "./components/ui/progress";
import { Separator } from "./components/ui/separator";

interface RevenueData {
  month: string;
  revenue: number;
}

const revenueData: RevenueData[] = [
  { month: "1月", revenue: 4200 },
  { month: "2月", revenue: 5800 },
  { month: "3月", revenue: 4900 },
  { month: "4月", revenue: 7200 },
  { month: "5月", revenue: 6100 },
  { month: "6月", revenue: 8900 },
  { month: "7月", revenue: 7600 },
  { month: "8月", revenue: 9800 },
  { month: "9月", revenue: 8300 },
  { month: "10月", revenue: 11200 },
  { month: "11月", revenue: 10500 },
  { month: "12月", revenue: 13400 },
];

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const categoryData: CategoryData[] = [
  { name: "エレクトロニクス", value: 35, color: "#3b82f6" },
  { name: "ファッション", value: 28, color: "#10b981" },
  { name: "食品・飲料", value: 20, color: "#f59e0b" },
  { name: "その他", value: 17, color: "#8b5cf6" },
];

type OrderStatus = "完了" | "処理中" | "配送中";

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: OrderStatus;
  avatar: string;
}

const recentOrders: RecentOrder[] = [
  {
    id: "#3891",
    customer: "田中 花子",
    product: "MacBook Pro 14",
    amount: "¥298,000",
    status: "完了",
    avatar: "田",
  },
  {
    id: "#3890",
    customer: "鈴木 一郎",
    product: "Sony WH-1000XM5",
    amount: "¥45,000",
    status: "処理中",
    avatar: "鈴",
  },
  {
    id: "#3889",
    customer: "山田 美咲",
    product: "iPad Air",
    amount: "¥98,000",
    status: "完了",
    avatar: "山",
  },
  {
    id: "#3888",
    customer: "佐藤 健",
    product: "AirPods Pro",
    amount: "¥39,800",
    status: "配送中",
    avatar: "佐",
  },
  {
    id: "#3887",
    customer: "渡辺 直美",
    product: "Apple Watch Ultra",
    amount: "¥129,800",
    status: "完了",
    avatar: "渡",
  },
];

interface TopProduct {
  name: string;
  sales: number;
  progress: number;
  trend: "up" | "down";
}

const topProducts: TopProduct[] = [
  { name: "MacBook Pro 14", sales: 142, progress: 85, trend: "up" },
  { name: "iPhone 15 Pro", sales: 98, progress: 72, trend: "up" },
  { name: "Sony WH-1000XM5", sales: 67, progress: 58, trend: "down" },
  { name: "iPad Air", sales: 54, progress: 45, trend: "up" },
];

interface NavItem {
  icon: LucideIcon;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "ダッシュボード" },
  { icon: ShoppingCart, label: "注文管理", badge: "12" },
  { icon: Package, label: "商品管理" },
  { icon: Users, label: "顧客管理" },
  { icon: TrendingUp, label: "分析レポート" },
  { icon: Star, label: "レビュー管理" },
  { icon: Settings, label: "設定" },
];

const statusStyle: Record<OrderStatus, string> = {
  完了: "bg-emerald-100 text-emerald-700",
  処理中: "bg-blue-100 text-blue-700",
  配送中: "bg-amber-100 text-amber-700",
};

export default function App() {
  const [dark, setDark] = useState(false);
  const [activeNav, setActiveNav] = useState("ダッシュボード");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Apply dark mode to document root
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Overlay for mobile when sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-card flex flex-col transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:static md:flex-shrink-0`}
      >
        <div className="p-6 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ShopAdmin</span>
          </div>
          <button
            className="md:hidden p-1 rounded hover:bg-accent"
            onClick={() => setSidebarOpen(false)}
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ icon: Icon, label, badge }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeNav === label
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <Separator />
        <div className="p-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                管
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">管理者</p>
              <p className="text-xs text-muted-foreground truncate">
                admin@shop.jp
              </p>
            </div>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card px-6 py-4 flex items-center gap-4 shrink-0">
          {/* Mobile menu button */}
          <div className="md:hidden mr-2">
            <button
              className="p-1 rounded hover:bg-accent"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="検索..." className="pl-9 h-9 bg-background" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="通知を表示"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark(!dark)}
              aria-label={
                dark ? "ライトモードに切り替え" : "ダークモードに切り替え"
              }
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                管
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                ダッシュボード
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                2025年の売上サマリーと最新情報
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                フィルター
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                title: "総売上",
                value: "¥12.4M",
                change: "+18.2%",
                up: true,
                icon: TrendingUp,
              },
              {
                title: "注文数",
                value: "4,891",
                change: "+12.5%",
                up: true,
                icon: ShoppingCart,
              },
              {
                title: "顧客数",
                value: "2,340",
                change: "+8.1%",
                up: true,
                icon: Users,
              },
              {
                title: "返品率",
                value: "2.4%",
                change: "-0.8%",
                up: false,
                icon: Package,
              },
            ].map(({ title, value, change, up, icon: Icon }) => (
              <Card key={title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${up ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {change}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      前月比
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">売上推移</CardTitle>
                <CardDescription>過去12ヶ月の月別売上</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: any) => [`¥${v.toLocaleString()}`, "売上"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#grad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">カテゴリ別売上</CardTitle>
                <CardDescription>売上構成比</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v}%`]}
                      contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {categoryData.map(({ name, value, color }) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 text-muted-foreground truncate">
                        {name}
                      </span>
                      <span className="font-medium">{value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">最近の注文</CardTitle>
                    <CardDescription>直近5件の注文状況</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    すべて見る <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm bg-muted">
                          {order.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {order.customer}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.product}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{order.amount}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.id}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusStyle[order.status]}`}
                      >
                        {order.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">売れ筋商品</CardTitle>
                <CardDescription>今月のトップ商品</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {topProducts.map(({ name, sales, progress, trend }) => (
                  <div key={name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate pr-2">{name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {trend === "up" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                        )}
                        <span className="text-muted-foreground">{sales}件</span>
                      </div>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full text-sm" size="sm">
                  全商品レポートを見る
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
