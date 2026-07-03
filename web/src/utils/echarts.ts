// echarts 按需引入：只注册实际用到的图表与组件，替代 `import * as echarts`（整包）。
// 全站图表仅有折线图 + 横向条形图，坐标系用 grid，另加 tooltip 与渐变（graphic）。
// 新增图表类型时，在此处补 use() 即可，页面统一从本模块导入。
import { use, init, getInstanceByDom, graphic } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer])

export { init, getInstanceByDom, graphic }
export type { ECharts, EChartsCoreOption }
