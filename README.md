# 光电检测技术期末复习网页

本项目从 `optical_detection_red_star_focus.pdf` 和已有本地复习手册整理出章节知识点、公式、理论框架与交互题库。

公开访问地址：

```text
https://kevin-guo112.github.io/optical-detection-review/
```

## 内容

- 8 个章节知识点卡片
- 97 道题
- 题型覆盖：单选、多选、填空、解答、实验
- 额外标注 9 道“计算/公式应用”题，仍归入解答题练习
- 68 张逐页 PPT 覆盖卡，用于核对每一页 PDF 是否复习到
- 本地浏览器保存答题进度和错题

## 本地使用

直接打开：

```text
site/index.html
```

或启动本地预览：

```powershell
npm.cmd run serve
```

然后访问：

```text
http://localhost:4173
```

如果本地服务器被环境限制，直接打开 `site/index.html` 即可；网页没有后端依赖。

## 手机上打开

手机和电脑连接同一个 Wi-Fi，然后双击：

```text
start-mobile-preview.cmd
```

命令窗口会打印类似下面的地址：

```text
Phone preview: http://192.168.x.x:4173
```

在手机浏览器输入这个地址即可。使用期间不要关闭命令窗口。若 Windows 防火墙弹窗，请允许专用网络访问。

## 校验

```powershell
npm.cmd run validate
npm.cmd run smoke
```

校验会检查章节数、题目数量、选择题 4 个选项、答案索引、题型数量、章节引用和静态入口文件。

## GitHub Pages 发布

已部署到 GitHub Pages：

```text
https://kevin-guo112.github.io/optical-detection-review/
```

GitHub 仓库：

```text
https://github.com/kevin-Guo112/optical-detection-review
```
