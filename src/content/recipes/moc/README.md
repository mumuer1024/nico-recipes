# 菜谱内容导航

[总索引](菜谱目录.md)覆盖 1991 道菜谱：Nico的家庭菜谱（持续修缮中）3 道、GLP-1 合集 108 道、Boston 合集 1880 道。

## 目录结构

```text
recipes/
  花毛一体.md
  照烧鸡腿排.md
  自制牧场酱.md
  GLP-1高蛋白食谱（美）/          108 道菜谱，保留既有文件名
  boston-cooking-school-cookbook/
    recipes/                    原书第 03–36 章，共 34 个章节目录
    moc/
      README.md                 来源与收录范围说明
      index.md                  英文原名索引
      index.zh-CN.md            已有中文名称对照索引
  moc/
    README.md                   本说明
    菜谱目录.md                  站点使用的完整总索引
```

Boston 的[来源说明](../boston-cooking-school-cookbook/moc/README.md)、[英文索引](../boston-cooking-school-cookbook/moc/index.md)和[已有中文名称索引](../boston-cooking-school-cookbook/moc/index.zh-CN.md)集中在合集的 `moc/` 中。英文正文、元数据、文件名与章节路径均保留原样；本次未增加翻译。

## 索引与路径约定

总索引按“Nico的家庭菜谱（持续修缮中） / GLP-1高蛋白食谱（美） / The Boston Cooking-School Cook Book”组织，合集内分别保留原有分类和原书章节顺序。为兼容当前站点只读取一个总索引的逻辑，总索引保留全部单道菜谱条目，不仅列出分索引入口。

总索引中的 Markdown 菜谱目标以 `src/content/recipes/` 为基准，使用完整内容路径，符合现有站点解析方式并避免同名菜谱歧义；这些目标不是相对 `moc/` 的普通文件链接。所有菜谱条目统一采用 `- [菜名](内容路径.md)`，可在其后保留说明；根目录三道菜谱同样使用此语法。Boston 分索引以及本说明使用相对所在文件的普通 Markdown 链接。

说明与索引放入 `moc/`，沿用现有加载器排除该目录的规则，避免将它们识别为单道菜谱。新增或移动菜谱时，应同步检查总索引以及所属合集分索引的路径和收录数量。

## 留待站点迭代

现有页面按有菜谱条目的分类平铺显示，不呈现“合集—章节”的嵌套关系；Boston 分索引是内容导航文件，当前没有独立站点页面。总索引的内容根路径约定也不等同于普通 Markdown 阅读器的相对链接语义。后续可在站点层处理层级导航、分索引接入与链接解析，本次不修改代码。
