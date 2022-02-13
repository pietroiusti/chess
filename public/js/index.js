"use strict";

(()=>{
  let roomNumber;

  document.getElementsByClassName("inp")[0].addEventListener("keyup", (event) => {
    event.preventDefault();
    if (event.keyCode === 13) {
      roomNumber = document.getElementsByTagName('input')[0].value;
      console.log('woooo: ' + roomNumber);
      document.getElementsById('roomNumberForm').submit();
    }
  });

})();
