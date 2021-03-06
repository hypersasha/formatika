/**
 * Subscribers Class.
 * Used to draw get subscribers from Server and draw the subscribers table.
 */
 class SubscribersTable {
  #table_container = null;
  #todays_control = null;
  #active_control = null;
  #search_field = null;

  #search_request = null;
  #is_todays = false;
  #is_only_actives = true;

  #subscribers = [];

  static API_URL = 'https://prod.formatika-api.net.ru/api/v1';

  constructor() {
    axios.defaults.headers.common['access-password'] = this.getPassword() || prompt('Введите пароль менеджера') 
    
    this.#search_field = document.getElementById('search');
    this.#search_field.addEventListener('input', this.search.bind(this));
    this.#table_container = document.getElementsByClassName('subscribers')[0];

    this.#todays_control = document.getElementsByClassName('todays-only')[0];
    if (this.#todays_control) {
      this.#todays_control.addEventListener('click', this.toggleTodays.bind(this));
    }

    this.#active_control = document.getElementsByClassName('active-only')[0];
    if (this.#active_control) {
      this.#active_control.addEventListener('click', this.toggleActives.bind(this));
    }

    if (!this.#table_container) {
      console.error('Cannot find .subscribers element in the DOM');
    } else {
      this.getSubscribers();
    }
  }

  /**
   * Save entered manager password to localStorage
   * @return {String} Saved password
   */
  savePassword(password) {
    localStorage.setItem('access-password', password);
    return password;
  }

  /**
   * Get saved password.
   * @return {String} password.
   */
  getPassword() {
    return localStorage.getItem('access-password');
  }

  /**
   * Remove saved password.
   */
  clearPassword() {
    localStorage.removeItem('access-password');
  }

  /** 
   * Make API call to get all subscribers. 
   * @return {Object[]} Array of Subscriber objects. 
   */
  getSubscribers() {
    axios({
      url: '/subscribers',
      params: {include_inactive: !this.#is_only_actives},
      baseURL: SubscribersTable.API_URL,
      method: 'get'
    }).then((response) => {
      if (response.status === 200) {
        this.#subscribers = [];
        response.data.forEach((sub) => {
          this.#subscribers.push(new Subscriber(sub));
        });
        this.render();

        // Save password for future log-in.
        if (axios.defaults.headers.common['access-password'] 
          && axios.defaults.headers.common['access-password'].length > 0) {
          this.savePassword(axios.defaults.headers.common['access-password']);
        }

      } else {
        alert('Не удалось загрузить подписчиков.');
        console.log(response);
      }
    }).catch((error) => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data.detail) {
          alert(error.response.data.detail);
        }
        if (error.response.status === 403) {

        }
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
    })
  }

  /**
   * Apply filter by email for search through subscribers.
   * @param {event} e 
   */
  search(e) {
    if (e.target.value.trim().length > 0) {
      this.#search_request = e.target.value.trim();
    } else {
      this.#search_request = null;
    }
    this.render();
  }

  /**
   * Colelcts all subscribers with specific email.
   * @returns {Subscriber[]} Subscribers with searched email.
   */
  searchSubscribers() {
    const filtered = this.#subscribers.filter((sub) => {
      return sub.email.toLowerCase().indexOf(this.#search_request.toLowerCase()) >= 0 
        || sub.name.toLowerCase().indexOf(this.#search_request.toLowerCase()) >= 0;
    });
    return filtered;
  }

  /**
   * Toggle filter to display users subscribed at today date.
   */
  toggleTodays() {
    this.#is_todays = !this.#is_todays;
    if (this.#is_todays) {
      this.#todays_control.classList.add('active');
      this.#todays_control.getElementsByClassName('material-icons')[0].innerHTML = 'check_box';
    } else {
      this.#todays_control.classList.remove('active');
      this.#todays_control.getElementsByClassName('material-icons')[0].innerHTML = 'check_box_outline_blank';
    }
    this.render();
  }

  /**
   * Toggle filter to display users with inactive subscription.
   */
  toggleActives() {
    this.#is_only_actives = !this.#is_only_actives;
    if (this.#is_only_actives) {
      this.#active_control.classList.add('active');
      this.#active_control.getElementsByClassName('material-icons')[0].innerHTML = 'check_box';
    } else {
      this.#active_control.classList.remove('active');
      this.#active_control.getElementsByClassName('material-icons')[0].innerHTML = 'check_box_outline_blank';
    }
    this.getSubscribers();
  }

  getTodays(subs) {
    const filtered = subs.filter((sub) => {
      return sub.isTodaySubscriber();
    });
    return filtered;
  }

  render() {
    // Clear subs container
    this.#table_container.innerHTML = '';

    // Apply search request
    let subs = (this.#search_request ? this.searchSubscribers() : this.#subscribers);

    if (this.#is_todays) {
      subs = this.getTodays(subs);
    }

    subs.forEach((sub) => {
      this.#table_container.appendChild(sub.render());
    })
  }
}

/**
 * Subscriber Class with id, name, email etc.
 * Used to charge, cancel subscriptions.
 */
class Subscriber {

  #id = null;
  #name;
  #child_name;
  #email;
  #is_active = false;
  #date_subscribed;

  #dom_container = null;
  #is_paid = false;

  constructor(data) {
    this.#id = data.id;
    this.#name = data.name;
    this.#child_name = data.child_name;
    this.#email = data.email;
    this.#date_subscribed = data.date_subscribed;
    this.#is_active = data.is_active;
    this.regular_amount = 0;

    this.#dom_container = document.createElement('div');
    this.#dom_container.className = 'subscriber';
  }

  /**
   * Calls API method to cancel subscription by user email.
   */
  cancelSubscription() {
    axios({
      url: '/subscribers/cancel',
      baseURL: SubscribersTable.API_URL,
      method: 'post',
      data: {
        'subscriber_email': this.#email
      }
    }).then((response) => {
      if (response.status === 200) {
        if (response.data && response.data.cancelled_subscriber_ids) {
          this.#is_active = false;
          this.render();
        } else {
          alert('Произошла ошибка при отключении подписки. F12, чтобы открыть консоль.');
          console.log(response);
        }
      } else {
        alert('Произошла ошибка при отключении подписки. F12, чтобы открыть консоль.');
        console.log(response);
      }
    }).catch((error) => {
      alert('Произошла ошибка при отключении подписки. F12, чтобы открыть консоль.');
      console.error(error);
    })
  }

  toggleSubscription() {
    if (this.#is_active) {
      showConfirm('Отменить подписку',
        'Точно хотите отменить подписку для пользователя <b>' + this.#email + '</b>?\n\nПодписку нельзя будет возобновить.',
        'Продолжить',
        this.cancelSubscription.bind(this)
      );
    }
  }

  render() {
    this.#dom_container.innerHTML = '';
    this.#dom_container.appendChild(this.createCell(this.createTextSpan(this.#name)));
    this.#dom_container.appendChild(this.createCell(this.createTextSpan(this.#email)));
    this.#dom_container.appendChild(this.createCell(this.createTextSpan(this.#child_name)));

    let sub_date = new Date(this.#date_subscribed);
    this.#dom_container.appendChild(this.createCell(this.createTextSpan(sub_date.toLocaleString('default', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }))));

    // Create actions
    const pause_subscription = document.createElement('div');
    pause_subscription.className = 'subscriber--cell-action noselect';
    pause_subscription.innerHTML = this.#is_active ? '<span class="material-icons md-18 md-orange">cancel</span>' : '<span class="material-icons md-18 md-green">play_circle</span>';
    pause_subscription.addEventListener('click', this.toggleSubscription.bind(this));

    const charge = document.createElement('div');
    charge.className = 'subscriber--cell-action noselect' + (this.#is_paid ? ' paid' : '');
    charge.innerHTML = '<span class="material-icons md-18 md-blue">' + (this.#is_paid ? 'price_check' : 'local_atm') + '</span>';

    if (!this.#is_paid) {
      charge.addEventListener('click', this.showChargeDialog.bind(this));
    }

    if (this.#is_active) {
      this.#dom_container.appendChild(this.createCell(pause_subscription, charge));
    } else {
      this.#dom_container.appendChild(this.createCell());
    }

    return this.#dom_container;
  }

  createTextSpan(text) {
    const node = document.createElement('span');
    node.innerHTML = text;

    return node;
  }

  createCell() {
    const cell = document.createElement('div');
    cell.className = 'subscriber--cell';

    // Add all childs
    if (arguments.length > 0) {
      for (let i = 0; i < arguments.length; ++i) {
        cell.appendChild(arguments[i]);
      }
    }

    return cell;
  }

  showChargeDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const dialog = document.createElement('div');
    let sub_date = new Date(this.#date_subscribed);
    sub_date = sub_date.toLocaleString('default', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    dialog.className = 'confirm-dialog';
    dialog.innerHTML = '<div class="confirm-dialog--header">' +
      '<h2>Оплата подписки</h2>' +
      '<div class="close noselect" onClick="destroyConfirm()">' +
      '<span class="material-icons md-black">close</span>' +
      '</div>' +
      '</div>' +
      '<div class="confirm-dialog--content">' +
      '<p><b>Имя клиента: </b>' + this.#name + '<br/><b>Почта: </b>' + this.#email + '<br/><b>Подписан(а): </b>' + sub_date + '</p>' +
      '<input type="number" placeholder="Сумма списания" id="pay_amount" oninput="validateInput(event)" />' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog--actions left';

    const pay = document.createElement('button');
    pay.className = 'accept payment';
    pay.innerHTML = 'Списать средства';
    pay.addEventListener('click', this.charge.bind(this));

    const cancel_action = document.createElement('button');
    cancel_action.className = 'cancel';
    cancel_action.innerHTML = 'Отмена';
    cancel_action.addEventListener('click', destroyConfirm);

    actions.appendChild(pay);
    actions.appendChild(cancel_action);

    dialog.appendChild(actions);

    // Insert window into the DOM
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  set status(status) {
    this.#is_active = status;
    this.render();
  }

  set is_paid(paid) {
    this.#is_paid = paid;
    console.log(paid);
    this.render();
  }

  get email() {
    return this.#email;
  }

  get name() {
    return this.#name;
  }

  /**
   * Makes HTTP request to /charge endpoint.
   */
  charge() {
    let pay_amount = document.getElementById('pay_amount');
    if (pay_amount) {
      if (pay_amount.value.length > 0) {
        if (parseInt(pay_amount.value)) {
          const amount = parseInt(pay_amount.value) * 100;

          // Make request on charge method here.
          axios({
            url: '/charge/',
            baseURL: SubscribersTable.API_URL,
            method: 'post',
            data: {
              'subscriber_id': this.#id,
              'amount': parseInt(pay_amount.value) * 100
            }
          }).then(response => {
            if (response.status === 200) {
              if (response.data) {
                this.is_paid = true;
                showConfirm('Оплата успешна', 'С клиента <b>' + this.#name + '</b> (ID: ' + response.data.charged_subscriber_id + ') списано ' + (response.data.charged_amount / 100) + ' руб.');
                console.log(response)
              }
            }
          }).catch(error => {
            if (error.response.data.detail) {
              alert(error.response.data.detail)
            } else {
              alert('Неизвестная ошибка при списании средств.')
            }
          })

          destroyConfirm();
        }
      }
    }
  }

  /**
   * Checks if client were subscribed today.
   * @returns {Boolean} Were client subscribed today?
   */
  isTodaySubscriber() {
    let today = new Date();
    let sub_date = new Date(this.#date_subscribed);
    return (today.getDate() === sub_date.getDate() && today.getMonth() === sub_date.getMonth());
  }
}

const subsTable = new SubscribersTable();
subsTable.render();