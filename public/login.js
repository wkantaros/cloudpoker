const form = document.getElementById('login-form');
// const API_URL = 'http://localhost:8080/session';
// const API_URL = 'https://d2689150.ngrok.io/session';

form.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('form successfully submitted');
    const formData = new FormData(form);
    const name = formData.get('name');
    const stack = parseInt(formData.get('stack')) || 1000;
    const smallBlind = parseInt(formData.get('small-blind')) || 25;
    const bigBlind = parseInt(formData.get('big-blind')) || 50;
    // console.log(`${name} (${stack}) sb: ${smallBlind}, bb: ${bigBlind}`);

    const game = {
        name,
        stack,
        smallBlind,
        bigBlind
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