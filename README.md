# 光电检测技术期末复习网页

本项目从 `optical_detection_red_star_focus.pdf` 和已有本地复习手册整理出章节知识点、公式、理论框架与交互题库。

## 内容

- 8 个章节知识点卡片
- 88 道题
- 题型覆盖：单选、多选、填空、解答、实验
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

仓库已包含 `.github/workflows/pages.yml`。发布步骤：

1. 在 GitHub 新建一个空仓库。
2. 在本目录初始化并推送到 `main` 分支。
3. 打开仓库 Settings -> Pages，将 Source 设为 GitHub Actions。
4. 推送后 Actions 会把 `site/` 发布到 GitHub Pages。

当前机器没有检测到 `gh` CLI，也没有 Git 全局用户名/邮箱配置，因此未直接创建远程仓库或推送。
