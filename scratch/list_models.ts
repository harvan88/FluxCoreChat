const apiKey = 'AIzaSyBRlPA33UIPWamMLdRbdmSTmn-3E_XGKPE';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    const response = await fetch(url);
    const data = await response.json();
    const names = data.models.map(m => m.name);
    console.log(JSON.stringify(names, null, 2));
}

listModels();
