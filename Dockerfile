FROM mcr.microsoft.com/dotnet/sdk:10.0.401 AS build
WORKDIR /src
COPY global.json ./
COPY apps/api/StoreCraft.Api.csproj apps/api/packages.lock.json apps/api/
RUN dotnet restore apps/api/StoreCraft.Api.csproj --locked-mode
COPY apps/api/ apps/api/
RUN dotnet publish apps/api/StoreCraft.Api.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.12 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "StoreCraft.Api.dll"]
