namespace StoreCraft.Api.Features.Orders;

public interface IDemoPayment
{
    string Settle(string requestedOutcome);
}
public sealed class DemoPayment : IDemoPayment
{
    public string Settle(string requestedOutcome) => requestedOutcome is "Paid" or "Failed" ? requestedOutcome : throw new ArgumentException("Unsupported demo outcome.");
}
