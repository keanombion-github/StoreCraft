using StoreCraft.Api.Features.Storefront;

public class Containers
{
    [Fact]
    public void ColumnLayoutsValidatePlacementLimitsAndRejectNesting()
    {
        var container = new PageSection("columns", "Container", "Layout", "", "", "", Columns: 8, Gap: 24, Alignment: "center");
        var child = new PageSection("child", "ImageText", "Story", "", "", "", ParentId: container.Id, Column: 7);
        var page = PageRules.Default with { Sections = [..PageRules.Default.Sections, container, child] };
        Assert.Null(PageRules.Validate(page));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container with { Columns = 9 }] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container, child with { Column = 8 }] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container, child with { ParentId = "missing" }] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container, container with { Id = "nested", ParentId = container.Id, Column = 0 }] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container, child with { Type = "Navigation" }] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [container, ..Enumerable.Range(0, 9).Select(i => child with { Id = "child-" + i, Column = 0 })] }));
        Assert.NotNull(PageRules.Validate(page with { Sections = [child with { ParentId = null, Column = 0 }] }));
    }
}

public class ContentWidgets
{
    [Xunit.Fact]
    public void WidgetsAndContainerChildrenValidateInEveryRegion()
    {
        foreach (var region in new[]{"Header", "Main", "Footer"}) {
            var container = new StoreCraft.Api.Features.Storefront.PageSection("anywhere", "Container", "Layout", "", "", "", Region:region);
            var child = new StoreCraft.Api.Features.Storefront.PageSection("inside", "Text", "Text", "Content", "", "", Region:region, ParentId:container.Id, Column:0);
            var html = new StoreCraft.Api.Features.Storefront.PageSection("markup", "Html", "", "", "", "", Region:region, Html:"<style>h2{color:purple}</style><h2>Hello</h2>");
            var page = StoreCraft.Api.Features.Storefront.PageRules.Default with { Sections=[..StoreCraft.Api.Features.Storefront.PageRules.Default.Sections, container, child, html] };
            Xunit.Assert.Null(StoreCraft.Api.Features.Storefront.PageRules.Validate(page));
            Xunit.Assert.NotNull(StoreCraft.Api.Features.Storefront.PageRules.Validate(page with {Sections=[..page.Sections.Where(s => s.Id != html.Id), html with {Html="<script>alert(1)</script>"}]}));
            Xunit.Assert.NotNull(StoreCraft.Api.Features.Storefront.PageRules.Validate(page with {Sections=[..page.Sections.Where(s => s.Id != child.Id), child with {Region=region == "Main" ? "Header" : "Main"}]}));
        }
    }
}
