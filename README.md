# Mac 状态卡片

一个简洁的中文 [Übersicht](https://tracesof.net/uebersicht/) 桌面组件，集中显示内存、存储和上下行网速。

A compact Chinese desktop status widget for macOS, built with Übersicht. Shows memory, APFS free space, and network throughput with resource status colors.

## 功能

- 每 5 秒采样，显示采样时间。
- 内存驻留估算、压缩器占用，以及独立的系统内存压力等级。
- 系统 APFS 容器可用容量，空间偏低时黄红提醒。
- 活跃物理网络接口的上下行速率。
- 读取失败、首次网速采样或状态不明时显示“未知”。
- 标题小点汇总内存压力和存储状态：正常绿、偏紧黄、严重红、未知灰。
- 点击卡片打开 macOS“活动监视器”，也支持卡片获得焦点后按 Enter 或空格。

这是个人分享的小组件，没有 CPU/GPU、历史图表、通知或图形设置界面。

## 安装

1. 从 [Übersicht 官网](https://tracesof.net/uebersicht/)安装并运行 Übersicht。官网要求 macOS 12 或更新版本。
2. 下载本仓库 ZIP 并解压，或使用 Git 克隆。
3. 从 Übersicht 打开组件文件夹，将本仓库中的整个 **`mac-status` 文件夹**放进去。组件文件夹通常是 `~/Library/Application Support/Übersicht/widgets/`。
4. 保持文件夹名称为 `mac-status`，等待 Übersicht 自动加载。网速需要连续两次有效采样才会显示。

请只复制 `mac-status`，不要复制整个仓库。已有同名文件夹时先备份，避免覆盖。无需完整 Xcode、Python、npm 或管理员权限；安装本组件不会配置登录启动。

停用：将 `mac-status` 移出 Übersicht 的组件文件夹。

## 打开活动监视器

点击卡片任意位置即可打开或切换到活动监视器。卡片底部有“活动监视器 ↗”提示；打开失败会显示提示，不影响采集。

交互已按 Übersicht 1.6 验证 API 和编译。如果卡片无法接收点击，请确认 Übersicht 的 **Enable interaction** 已开启，并且本卡片没有使用 **Send to Background**。旧版宿主的交互方式可能不同。

此功能仅在点击或按键时，通过 Übersicht 的 `run()` 执行固定命令 `/usr/bin/open -b com.apple.ActivityMonitor`；采样时不会自动打开应用，也不修改系统权限。

## 调整外观和阈值

编辑 `mac-status/index.jsx`：

- 位置和宽度在 `className`：默认 `left: 32px; top: 240px; width: 292px;`。这些值适合作者桌面，可按自己的日历、天气、图标布局调整。
- 刷新周期在 `refreshFrequency`，单位毫秒。网络样本间隔达到 30 秒会显示未知并重新建立差分。
- 磁盘阈值在 `storageThresholds`：黄色为可用容量 ≤ `max(总容量 × 10%, 20 GiB)`；红色为 ≤ `max(总容量 × 5%, 5 GiB)`，红色优先。等号包含在阈值中。

磁盘阈值是本组件的提醒规则，不是 macOS 系统压力标准。比例与容量可自行修改；GiB = 1,073,741,824 字节。

内存状态依据只读 `kern.memorystatus_vm_pressure_level` 的 1/2/4 值，分别显示绿色正常、黄色偏高、红色严重。未知输出保持灰蓝。不会依据内存占用百分比推算压力。[Apple 内核转换逻辑](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/kern_memorystatus_notify.c#L1651) / [用户态标志定义](https://github.com/apple-oss-distributions/xnu/blob/xnu-8792.81.2/bsd/sys/event.h#L491)。

标题小点优先显示已知的严重或偏紧状态；只有内存压力和存储状态都正常时才显示绿色，其余状态未知时显示灰色。它不判断互联网是否可达，也不把网速高低当作告警。

## 指标口径

**内存**：`(max(0, Anonymous pages − Pages purgeable) + Pages wired down + Pages occupied by compressor) × page size`。包含压缩器物理占用，排除文件缓存；这是驻留估算，不等于活动监视器“内存使用量”。总量来自 `hw.memsize`。压力等级单独读取。

**存储**：从 `diskutil info -plist /` 找到系统 APFS 容器，仅读取该容器的 `CapacityCeiling` 和 `CapacityFree`。已分配 = 总量 − 可用；不累计共享空间的多个卷，也不把“可清除”空间算作实际空闲。非 APFS 系统会显示未知。

**网络**：只读取 `ifconfig` 显示 active 的 `enN` 接口，每个接口仅计一个 `netstat` 链路行。排除 IP 重复行、utun/TUN、lo、bridge 等接口。多个活跃 `enN` 会合计，因此不保证去重跨接口转发流量，也不覆盖非 `enN` 名称的特殊硬件。显示的是接口流量，不是互联网可达性。

速率按单调运行时间计算字节差分。首次采样、接口集合变化、计数回退、间隔 ≥30 秒均显示未知，下一对有效样本恢复。网速高低不触发资源告警。

## 测试与限制

在仓库根目录运行：

```sh
/bin/sh mac-status/test.sh
/bin/sh mac-status/collect.sh
```

52 项测试覆盖解析、APFS 容器选择、网卡去重、离线/长间隔、黄红阈值与未知值、子进程失败/超时和 plist 解析。在已安装 Übersicht 的 Mac 上，可选运行 36 项 React 渲染与交互检查，包含小点汇总、点击/键盘触发和打开失败处理：

```sh
"/Applications/Übersicht.app/Contents/Resources/node-arm64" tools/widget-render-tests.cjs
```

可选渲染检查使用 Übersicht 自带的 Node/React/Babel；如果你的安装路径或应用包结构不同，需要相应调整。组件运行本身不依赖这项检查。

已在一台运行 macOS 26 的 Mac 上核对实际数据和持续刷新。黄红/未知状态通过合成数据测试，未人为施加系统压力。睡眠恢复、离线/VPN 切换、多显示器和不同机型仍需更广泛的实际验证。

运行在受限沙箱时系统命令可能不可用，组件会显示未知。无需为了它扩大系统权限。每个子命令有 2.5 秒期限；多个命令连续超时可能让整次采集超过 5 秒。最后采样时间用于识别更新停滞。

Übersicht 使用浏览器渲染，宿主也会占用资源；本组件不是原生 macOS 小组件，也不承诺极低内存或电池开销。若卡片停止更新，可先检查 Übersicht 是否仍正常运行。

## 本地采集

本组件仅调用 macOS 自带的只读系统命令，不进行互联网探测、遥测或数据上传，不保存采样缓存，也不修改系统设置。网络前次样本保存在组件内存中。Übersicht 宿主自己的更新和网络行为由其设置决定。

## 许可

本仓库代码采用 [MIT License](LICENSE)。Übersicht 是独立项目，本仓库不包含或分发其安装包和依赖。
