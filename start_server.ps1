# Script PowerShell per avviare un server locale leggero
$port = 8080
$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server avviato su http://localhost:$port/"
Write-Host "Premi CTRL+C per fermarlo..."

Start-Process "http://localhost:$port"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        
        if ($requestUrl -eq "/") { $requestUrl = "/index.html" }
        
        $filePath = Join-Path $path $requestUrl.TrimStart('/')
        
        if (Test-Path $filePath) {
            $response = $context.Response
            
            # Imposta Content-Type basilare
            if ($filePath -match '\.css$') { $response.ContentType = "text/css" }
            elseif ($filePath -match '\.js$') { $response.ContentType = "application/javascript" }
            elseif ($filePath -match '\.json$') { $response.ContentType = "application/json" }
            else { $response.ContentType = "text/html" }

            $buffer = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
        } else {
            $context.Response.StatusCode = 404
            $context.Response.Close()
        }
    }
}
finally {
    $listener.Stop()
}
