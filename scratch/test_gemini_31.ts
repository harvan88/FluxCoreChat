const apiKey = 'AIzaSyBRlPA33UIPWamMLdRbdmSTmn-3E_XGKPE';
const model = 'gemini-3.1-flash-lite-preview';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function testGemini() {
    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: "Hola, ¿quién eres?"
                    }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

testGemini();
