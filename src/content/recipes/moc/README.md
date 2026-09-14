# 菜谱内容架构

## 内容源与物理目录

src/content/recipes/ 是菜谱内容根目录：
- nico/：猫猫家常食谱，目前 3 道。
- GLP-1高蛋白食谱（美）/：GLP-1 高蛋白食谱，目前 108 道，保留扁平文件组织。
- boston-cooking-school-cookbook/recipes/：Boston Cooking-School Cookbook，目前 1880 道，保留第 03–36 章的 34 个章节目录。
- moc/：全站人工展示索引和本说明。
- boston-cooking-school-cookbook/moc/：原书说明、英文索引和已有中文名称索引。

这里的 Collection 指业务上的一级内容源。站点继续使用 import.meta.glob 加载 Markdown，没有迁移为 Astro Content Collections，没有引入新的依赖或修改正文格式。src/lib/recipe-metadata.ts 中的 collections 登记稳定来源 ID、名称和根路径；所有非 moc/ Markdown 必须归属某个登记来源，否则构建失败。说明和手工索引必须放进 moc/，不生成详情页。

## metadata 契约

读取层保留原 frontmatter，在 RecipeFile 上提供以下统一字段：

| 字段 | 含义与维护方式 |
| --- | --- |
| id | slug + .md，保留既有菜谱 ID；不是物理路径 |
| slug | frontmatter.slug 优先，否则使用内容根相对路径去掉 .md |
| filePath | 当前内容根相对文件路径，用于定位源文件和解析总索引 |
| collectionId | nico / glp1 / boston，由来源根路径确定 |
| category | 来源内部分类对象（id、title、order），无分类时为 null |
| tags | 原 frontmatter.tags；自由标签字符串数组，缺省 [] |
| recipeTypes | frontmatter.recipe_types；多选逻辑类型，缺省 [] |
| sourceCategory | 原 category，缺省 null，不覆盖为统一逻辑类型 |
| sourceSection | 原 section，缺省 null |
| title | 原 title，缺少时使用文件名，不改写菜谱标题 |

来源内部分类：
- Nico：可选 category；现有 3 道没有统一内部分类，返回 null。原有中文字段和 Sauce 等 meal_type 原样保留在 frontmatter，不强行套用 GLP-1 规则。
- GLP-1：使用既有 meal_type，按 breakfast（23）、lunch（8）、dinner（59）、snack（15）、side_dish（3）的顺序生成早餐、午餐、晚餐、零食、配菜分类；原 category（如沙拉、主菜）另存 sourceCategory。这些是文件已有分类，尚未重新对照原书核验。
- Boston：使用章节目录作为分类 ID，chapter 作为名称、chapter_number 作为顺序，并校验章节号与目录一致；section 仍可用于后续章内细分。

recipe_types 只接受：正餐、零食、饮料、甜品、汤。一道菜可同时标记多个，例如 frontmatter 中写 recipe_types: [正餐, 汤]。这些值不是物理目录，不从 meal_type、章节或自由 tags 自动推断。现有菜谱本轮没有批量补标，统一返回空数组，表示尚未标注。酱汁、面团等内容不强迫归入这五类。

非法来源、slug、tags、recipe_types、GLP-1 餐型或 Boston 章节信息会阻止构建；原来的其他来源字段继续按原格式保留，并未对全部历史 frontmatter 强制统一 schema。

## 索引分工

1. 机器索引 collectionIndex：从实际 Markdown 和 metadata 自动生成“来源 → 内部分类 → 菜谱”。无需手工重复列菜谱，新增内容构建时自动纳入；分类只显示有内容的组，Nico 未分类组的 category 为 null。
2. 人工总索引 moc/菜谱目录.md：继续控制现有目录页的分组、顺序、中文显示名与说明。标题及条目顺序本轮不变，故现有页面仍然平铺旧分类。这不是来源 metadata 的权威来源。
3. Boston 的 moc/index.md、moc/index.zh-CN.md：保留原有相对文件链接及书内顺序，作为原书导航和已有中文名对照，暂不独立生成网页。

总索引中的 Markdown 链接以 src/content/recipes/ 为根，并非相对 moc/ 的普通 Markdown 文件链接。应使用完整相对路径，例如 nico/花毛一体.md；唯一短文件名与 WikiLink 继续兼容。多重匹配构建报错；无目标仍沿用 warning 与缺失条目展示。新增内容必须另外维护人工总索引，才会出现在现有目录页。Boston 新增或移动内容还需同步维护其两个分索引。

## URL 与移动文件

详情页和 recipeUrl 都使用 slug，而非 filePath：
- nico/花毛一体.md 的显式 slug 为 花毛一体，URL 仍为 /recipes/花毛一体/（链接会进行逐段 URL 编码）。
- GLP-1 和 Boston 没有移动，继续使用原完整路径作为默认 slug。
- GitHub Pages 的 BASE_URL 前缀仍由既有 Astro 配置添加。

未来移动或重命名已发布菜谱前，先将原 slug 写入 frontmatter，并保留该值；同时更新人工索引中的文件链接。不要因为移动文件修改 slug 或 id。slug 必须为未编码的相对路径，不能包含查询、片段、反斜线、空路径段或 . / .. 段；重复 slug（含大小写或 Unicode NFC 冲突）会阻止构建。仅原样搬移而不固定 slug 会改变默认 URL。

## 下一阶段的数据接口

从 src/lib/recipes.ts 导入：
- recipes：含 Markdown Content 组件的服务端完整条目，用于现有静态详情页。
- recipeCatalog：可 JSON 序列化的全量 metadata，包含 url、displayTitle 和 description，不包含 Markdown 组件。displayTitle/description 来自现有人工总索引，缺少时回退到 title。
- collectionIndex：每个来源包含 recipes 和 categories；分类组含 category 与 recipes，均为可序列化条目。来源和分类顺序稳定；菜谱组内沿用 glob 顺序，不代表原书编排顺序。
- collections、recipeTypes：来源注册表与逻辑类型词表。
- directory、parseDirectory、recipeUrl：保持现有页面的数据接口。

下一阶段可消费 collectionIndex 做来源目录，按 recipeCatalog 的 recipeTypes 多选筛选、按 id 去重，使用 url 生成链接。本轮未接入浏览器脚本、API 路由、目录页重设计或扭蛋功能。逻辑类型的实际标注、前端筛选行为、原书顺序展示以及 UI 调整留待后续；不要把空 recipeTypes 当作“不能参与聚合”的永久结论。

验证命令：npm run build；Node 22.12+ 下运行 node --experimental-strip-types --test tests/recipe-metadata.test.mjs。
