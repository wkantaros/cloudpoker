const form = document.getElementById('login-form');
const API_URL = `${window.location.href}session`
// const API_URL = 'http://localhost:8080/session';
// const API_URL = 'https://d2689150.ngrok.io/session';

document.getElementById("name").select();

form.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('form successfully submitted');
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const stack = formData.get('stack') || 1000;
    const smallBlind = parseInt(formData.get('small-blind')) || 25;
    const bigBlind = parseInt(formData.get('big-blind')) || 50;
    let straddleLimit = 0;
    if (formData.get('straddle')){
      straddleLimit = 1;
    }
    if (formData.get('multi-straddle')) {
      straddleLimit = -1;
    }
    alert(straddleLimit);

    const game = {
        name,
        stack,
        smallBlind,
        bigBlind,
        straddleLimit,
    };
    console.log(game);

    fetch(`${window.location.href}session`, {
        method: 'POST',
        body: JSON.stringify(game),
        headers: {
            'content-type': 'application/json'
        }
    }).then(res => res.json())
      .then(data => {
          if (!data.isValid){
            alert(data.message);
          } else {
            //   console.log(data.shortid);
            window.location.href = `/session/${data.shortid}`;
          }
      });
});