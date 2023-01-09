setInterval(() => {
     document.querySelectorAll("li").forEach(function (e) {
          e.id && e.innerHTML.match(/Promoted/) && e.remove()
     });
}, 300);