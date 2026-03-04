$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1MzU5NDliOC01OGE5LTQzMTAtODdhNy00MmEyNDgwZjU3NDYiLCJlbWFpbCI6ImhhcnZhbkBob3RtYWlsLmVzIn0.b4gZTu8eQRPhqlDxBAlM2Pzy9bBgK34hU-lOA9Ixh6w"
}

$body = @{
    conversationId = "db4c7b37-3b58-4d8a-b61c-8a7060101d23"
    senderAccountId = "3e94f74e-e6a0-4794-bd66-16081ee3b02d"
    content = @{
        text = "Test de IA con mode=auto activado $(Get-Date -Format 'HH:mm:ss')"
    }
    type = "outgoing"
    generatedBy = "human"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/messages" -Method Post -Headers $headers -Body $body -ContentType "application/json"
