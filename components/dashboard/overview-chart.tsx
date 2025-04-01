import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "1월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "2월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "3월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "4월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "5월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "6월",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
]

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#8884d8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
} 