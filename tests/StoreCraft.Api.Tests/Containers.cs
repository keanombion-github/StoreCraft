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
