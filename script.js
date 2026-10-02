$(function () {
  'use strict';

  /* ======================================================
     Settings
  ====================================================== */
  var STORAGE_KEY = 'libraryDesk.v1';
  var FINE_PER_DAY = 2;      // ₹ per late day
  var LOAN_DAYS = 14;        // default loan period
  var SOON_DAYS = 2;         // "due soon" window

  var CATEGORIES = {
    'Fiction':    '#7a2e3a',
    'Science':    '#2f6b86',
    'History':    '#8a6a2f',
    'Technology': '#2f5d50',
    'Biography':  '#5b4a86',
    'Children':   '#c2517a',
    'Philosophy': '#44546a',
    'Other':      '#6a6f66'
  };

  /* ======================================================
     Helpers
  ====================================================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  function iso(d) {
    var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  }
  function today() { return iso(new Date()); }
  function addDays(s, n) {
    var d = new Date(s + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function diffDays(a, b) { // b - a, in days
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  function fmt(s) {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    return h;
  }

  /* ======================================================
     Data (saved in localStorage)
  ====================================================== */
  function seed() {
    var t = today();
    var data = {
      books: [
        { id: 'b1',  title: 'The God of Small Things',   author: 'Arundhati Roy',      category: 'Fiction',    copies: 3, year: 1997, isbn: '9780006550686' },
        { id: 'b2',  title: 'Wings of Fire',             author: 'A. P. J. Abdul Kalam', category: 'Biography', copies: 4, year: 1999, isbn: '9788173711466' },
        { id: 'b3',  title: 'A Brief History of Time',   author: 'Stephen Hawking',    category: 'Science',    copies: 2, year: 1988, isbn: '9780553380163' },
        { id: 'b4',  title: 'Sapiens',                   author: 'Yuval Noah Harari',  category: 'History',    copies: 3, year: 2011, isbn: '9780062316097' },
        { id: 'b5',  title: 'Clean Code',                author: 'Robert C. Martin',   category: 'Technology', copies: 1, year: 2008, isbn: '9780132350884' },
        { id: 'b6',  title: 'Fluent Python',             author: 'Luciano Ramalho',    category: 'Technology', copies: 2, year: 2015, isbn: '9781491946008' },
        { id: 'b7',  title: 'The Discovery of India',    author: 'Jawaharlal Nehru',   category: 'History',    copies: 2, year: 1946, isbn: '' },
        { id: 'b8',  title: 'Meditations',               author: 'Marcus Aurelius',    category: 'Philosophy', copies: 2, year: 180,  isbn: '' },
        { id: 'b9',  title: 'Malgudi Days',              author: 'R. K. Narayan',      category: 'Fiction',    copies: 3, year: 1943, isbn: '' },
        { id: 'b10', title: 'The Jungle Book',           author: 'Rudyard Kipling',    category: 'Children',   copies: 2, year: 1894, isbn: '' }
      ],
      members: [
        { id: 'm1', name: 'Anitha Selvam', email: 'anitha.selvam@example.com', phone: '9876500011', joined: addDays(t, -240) },
        { id: 'm2', name: 'Joseph Raj',    email: 'joseph.raj@example.com',    phone: '9876500022', joined: addDays(t, -200) },
        { id: 'm3', name: 'Meena Kumari',  email: 'meena.kumari@example.com',  phone: '9876500033', joined: addDays(t, -150) },
        { id: 'm4', name: 'Arun Prakash',  email: 'arun.prakash@example.com',  phone: '9876500044', joined: addDays(t, -90) },
        { id: 'm5', name: 'Sneha Thomas',  email: 'sneha.thomas@example.com',  phone: '9876500055', joined: addDays(t, -45) },
        { id: 'm6', name: 'Kumar Velu',    email: 'kumar.velu@example.com',    phone: '9876500066', joined: addDays(t, -10) }
      ],
      loans: [
        { id: 'l1', bookId: 'b3', memberId: 'm4', issued: addDays(t, -30), due: addDays(t, -16), returned: addDays(t, -15), fine: FINE_PER_DAY },
        { id: 'l2', bookId: 'b5', memberId: 'm2', issued: addDays(t, -20), due: addDays(t, -6),  returned: null, fine: 0 },
        { id: 'l3', bookId: 'b4', memberId: 'm3', issued: addDays(t, -12), due: addDays(t, 2),   returned: null, fine: 0 },
        { id: 'l4', bookId: 'b2', memberId: 'm5', issued: addDays(t, -9),  due: addDays(t, 5),   returned: null, fine: 0 },
        { id: 'l5', bookId: 'b1', memberId: 'm1', issued: addDays(t, -5),  due: addDays(t, 9),   returned: null, fine: 0 }
      ]
    };
    persist(data);
    return data;
  }

  function persist(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.books && parsed.members && parsed.loans) { return parsed; }
      }
    } catch (e) { /* ignore and reseed */ }
    return seed();
  }

  var db = load();
  function save() { persist(db); }

  function getBook(id)   { return db.books.filter(function (b) { return b.id === id; })[0]; }
  function getMember(id) { return db.members.filter(function (m) { return m.id === id; })[0]; }
  function activeLoans() { return db.loans.filter(function (l) { return !l.returned; }); }
  function activeCountForBook(id)   { return activeLoans().filter(function (l) { return l.bookId === id; }).length; }
  function activeCountForMember(id) { return activeLoans().filter(function (l) { return l.memberId === id; }).length; }
  function availableCopies(b) { return b.copies - activeCountForBook(b.id); }
  function catColor(c) { return CATEGORIES[c] || CATEGORIES.Other; }

  function loanFine(l) {
    var end = l.returned || today();
    return Math.max(0, diffDays(l.due, end)) * FINE_PER_DAY;
  }

  function loanStatus(l) {
    if (l.returned) { return { cls: 'done', text: 'Returned ' + fmt(l.returned) }; }
    var left = diffDays(today(), l.due);
    if (left < 0) { return { cls: 'overdue', text: plural(-left, 'day', 'days') + ' late' }; }
    if (left === 0) { return { cls: 'soon', text: 'Due today' }; }
    if (left <= SOON_DAYS) { return { cls: 'soon', text: 'Due in ' + plural(left, 'day', 'days') }; }
    return { cls: 'ok', text: 'On loan' };
  }

  /* ======================================================
     UI helpers: toast, dialogs, errors
  ====================================================== */
  function toast(msg, type) {
    var $t = $('<div class="toast"></div>').text(msg).toggleClass('error', type === 'error');
    $('#toasts').append($t);
    setTimeout(function () { $t.fadeOut(250, function () { $t.remove(); }); }, 3200);
  }

  function openDialog(sel) { var d = $(sel)[0]; if (d.showModal) { d.showModal(); } else { d.setAttribute('open', ''); } }
  function closeDialog(sel) { var d = $(sel)[0]; if (d.close) { d.close(); } else { d.removeAttribute('open'); } }

  $('dialog').on('click', function (e) { if (e.target === this) { closeDialog(this); } });
  $(document).on('click', '[data-close]', function () { closeDialog($(this).closest('dialog')); });

  var confirmAction = null;
  function confirmBox(title, text, okLabel, onOk) {
    $('#confirmTitle').text(title);
    $('#confirmText').text(text);
    $('#confirmOk').text(okLabel);
    confirmAction = onOk;
    openDialog('#confirmDialog');
  }
  $('#confirmOk').on('click', function () {
    closeDialog('#confirmDialog');
    if (confirmAction) { var fn = confirmAction; confirmAction = null; fn(); }
  });

  function showError($el, msg) { $el.text(msg).prop('hidden', false); }
  function clearError($el) { $el.text('').prop('hidden', true); }

  /* ======================================================
     Navigation
  ====================================================== */
  var TITLES = { dashboard: 'Dashboard', books: 'Books', members: 'Members', loans: 'Issue & return' };

  function showView(view) {
    if (!TITLES[view]) { view = 'dashboard'; }
    $('.view').prop('hidden', true);
    $('#view-' + view).prop('hidden', false);
    $('.nav-btn').removeClass('active').removeAttr('aria-current')
      .filter('[data-view="' + view + '"]').addClass('active').attr('aria-current', 'page');
    $('#viewTitle').text(TITLES[view]);
    if (history.replaceState) { history.replaceState(null, '', '#' + view); }
    window.scrollTo(0, 0);
  }

  $('.nav-btn').on('click', function () { showView($(this).data('view')); });

  /* ======================================================
     Dashboard
  ====================================================== */
  function renderDashboard() {
    var active = activeLoans();
    var t = today();
    var overdue = active.filter(function (l) { return l.due < t; });
    var copies = db.books.reduce(function (s, b) { return s + b.copies; }, 0);

    $('#st-titles').text(db.books.length);
    $('#st-shelf').text(copies - active.length);
    $('#st-out').text(active.length);
    $('#st-overdue').text(overdue.length);
    $('#stat-overdue').toggleClass('alert', overdue.length > 0);

    // Nav badge
    $('#navOverdue').text(overdue.length).prop('hidden', overdue.length === 0);

    // Shelf of spines
    var shelf = '';
    db.books.forEach(function (b) {
      var h = 150 + (hash(b.id + b.title) % 70);
      var left = availableCopies(b);
      shelf += '<button type="button" class="spine' + (left === 0 ? ' out' : '') + '" data-id="' + esc(b.id) + '"' +
        ' style="--c:' + catColor(b.category) + ';--h:' + h + 'px"' +
        ' title="' + esc(b.title) + ' by ' + esc(b.author) + ' (' + left + ' available)">' +
        '<span>' + esc(b.title) + '</span></button>';
    });
    $('#shelf').html(shelf || '<p class="muted">No books yet. Add your first book in Books.</p>');

    // Needs attention: overdue + due within window
    var soon = active.filter(function (l) { return diffDays(t, l.due) <= SOON_DAYS; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var att = '';
    soon.forEach(function (l) {
      var b = getBook(l.bookId), m = getMember(l.memberId), s = loanStatus(l);
      att += '<li><div class="what"><strong>' + esc(b ? b.title : 'Deleted book') + '</strong><span>' +
        esc(m ? m.name : 'Deleted member') + '</span></div><span class="tag ' + s.cls + '">' + esc(s.text) + '</span></li>';
    });
    $('#attentionList').html(att || '<li class="empty">Nothing is overdue or due in the next ' + SOON_DAYS + ' days.</li>');

    // Recent activity
    var events = [];
    db.loans.forEach(function (l, i) {
      var b = getBook(l.bookId), m = getMember(l.memberId);
      var title = b ? b.title : 'a deleted book', name = m ? m.name : 'A deleted member';
      events.push({ date: l.issued, order: i * 2, name: name, verb: 'borrowed', title: title });
      if (l.returned) { events.push({ date: l.returned, order: i * 2 + 1, name: name, verb: 'returned', title: title }); }
    });
    events.sort(function (a, b) { return a.date === b.date ? b.order - a.order : (a.date < b.date ? 1 : -1); });
    var act = '';
    events.slice(0, 6).forEach(function (e) {
      act += '<li><div class="what"><strong>' + esc(e.name) + ' ' + e.verb + '</strong><span>' + esc(e.title) + '</span></div>' +
        '<span class="when">' + fmt(e.date) + '</span></li>';
    });
    $('#activityList').html(act || '<li class="empty">No activity yet. Issue a book to get started.</li>');
  }

  $('#shelf').on('click', '.spine', function () {
    var b = getBook($(this).data('id'));
    if (!b) { return; }
    $('#bookSearch').val(b.title); $('#bookCat').val('all'); $('#bookAvail').val('all');
    renderBooks();
    showView('books');
  });

  /* ======================================================
     Books
  ====================================================== */
  function fillCategorySelects() {
    var opts = '';
    Object.keys(CATEGORIES).forEach(function (c) { opts += '<option>' + esc(c) + '</option>'; });
    $('#bCategory').html(opts);
    $('#bookCat').html('<option value="all">All categories</option>' + opts);
  }

  function renderBooks() {
    var q = $.trim($('#bookSearch').val()).toLowerCase();
    var cat = $('#bookCat').val();
    var av = $('#bookAvail').val();

    var list = db.books.filter(function (b) {
      var left = availableCopies(b);
      var hay = (b.title + ' ' + b.author + ' ' + (b.isbn || '')).toLowerCase();
      return (!q || hay.indexOf(q) > -1) &&
             (cat === 'all' || b.category === cat) &&
             (av === 'all' || (av === 'yes' ? left > 0 : left === 0));
    }).sort(function (a, b) { return a.title.localeCompare(b.title); });

    $('#bookCount').text(plural(list.length, 'book', 'books') + (list.length === db.books.length ? '' : ' found'));

    if (!list.length) {
      $('#bookGrid').html('<div class="empty-state">' +
        (db.books.length ? 'No books match these filters. Clear the search or choose another category.' : 'The catalogue is empty. Select Add book to create the first entry.') +
        '</div>');
      return;
    }

    var html = '';
    list.forEach(function (b) {
      var left = availableCopies(b);
      html += '<article class="book" data-id="' + esc(b.id) + '">' +
        '<div class="cover" style="--c:' + catColor(b.category) + '">' +
          '<span class="cover-title">' + esc(b.title) + '</span>' +
          '<span class="cover-author">' + esc(b.author) + '</span>' +
        '</div>' +
        '<div class="book-meta"><span>' + esc(b.category) + '</span><span>' + (b.year ? esc(b.year) : '') + '</span></div>' +
        '<p class="avail ' + (left > 0 ? 'ok' : 'none') + '">' + left + ' of ' + b.copies + ' available</p>' +
        '<div class="row-actions">' +
          '<button type="button" class="btn small ghost" data-act="edit-book">Edit</button>' +
          '<button type="button" class="btn small danger-ghost" data-act="delete-book">Delete</button>' +
        '</div></article>';
    });
    $('#bookGrid').html(html);
  }

  // Search listens to "input" only: a "change" event fires on blur and would
  // re-render the grid under the mouse, swallowing the click on Edit/Delete.
  $('#bookSearch').on('input', renderBooks);
  $('#bookCat, #bookAvail').on('change', renderBooks);

  function openBookForm(b) {
    clearError($('#bookError'));
    $('#bookForm .invalid').removeClass('invalid');
    $('#bookDialogTitle').text(b ? 'Edit book' : 'Add book');
    $('#bookSubmit').text('Save book');
    $('#bookId').val(b ? b.id : '');
    $('#bTitle').val(b ? b.title : '');
    $('#bAuthor').val(b ? b.author : '');
    $('#bCategory').val(b ? b.category : 'Fiction');
    $('#bCopies').val(b ? b.copies : 1);
    $('#bYear').val(b && b.year ? b.year : '');
    $('#bIsbn').val(b ? b.isbn : '');
    openDialog('#bookDialog');
    $('#bTitle').trigger('focus');
  }

  $('#addBook').on('click', function () { openBookForm(null); });

  $('#bookGrid').on('click', '[data-act]', function () {
    var id = $(this).closest('.book').data('id');
    var b = getBook(id);
    if (!b) { return; }
    if ($(this).data('act') === 'edit-book') {
      openBookForm(b);
    } else {
      if (activeCountForBook(id) > 0) {
        toast('“' + b.title + '” has copies on loan. Return them before deleting.', 'error');
        return;
      }
      confirmBox('Delete this book?', '“' + b.title + '” will be removed from the catalogue. Its loan history is kept.', 'Delete book', function () {
        db.books = db.books.filter(function (x) { return x.id !== id; });
        save(); renderAll();
        toast('Book deleted.');
      });
    }
  });

  $('#bookForm').on('submit', function (e) {
    e.preventDefault();
    var id = $('#bookId').val();
    var title = $.trim($('#bTitle').val());
    var author = $.trim($('#bAuthor').val());
    var copies = parseInt($('#bCopies').val(), 10);
    var year = $.trim($('#bYear').val());
    var isbn = $.trim($('#bIsbn').val());

    $('#bookForm .invalid').removeClass('invalid');
    var err = '';
    if (!title) { err = 'Enter the book title.'; $('#bTitle').addClass('invalid'); }
    else if (!author) { err = 'Enter the author name.'; $('#bAuthor').addClass('invalid'); }
    else if (!(copies >= 1)) { err = 'Copies must be 1 or more.'; $('#bCopies').addClass('invalid'); }
    else if (year && (isNaN(year) || +year < 1 || +year > 2100)) { err = 'Enter a valid year, or leave it blank.'; $('#bYear').addClass('invalid'); }
    else if (id && copies < activeCountForBook(id)) {
      err = 'Copies cannot be fewer than the ' + activeCountForBook(id) + ' currently on loan.'; $('#bCopies').addClass('invalid');
    }
    if (err) { showError($('#bookError'), err); return; }

    var data = { title: title, author: author, category: $('#bCategory').val(), copies: copies, year: year ? +year : '', isbn: isbn };
    if (id) {
      $.extend(getBook(id), data);
      toast('Book updated.');
    } else {
      db.books.push($.extend({ id: uid('b') }, data));
      toast('Book added.');
    }
    save(); renderAll();
    closeDialog('#bookDialog');
  });

  /* ======================================================
     Members
  ====================================================== */
  function renderMembers() {
    var q = $.trim($('#memberSearch').val()).toLowerCase();
    var list = db.members.filter(function (m) {
      return !q || (m.name + ' ' + m.email + ' ' + (m.phone || '')).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    $('#memberCount').text(plural(list.length, 'member', 'members') + (list.length === db.members.length ? '' : ' found'));

    if (!list.length) {
      $('#memberRows').html('<tr><td class="empty" colspan="5">' +
        (db.members.length ? 'No members match this search.' : 'No members yet. Select Add member to register the first one.') + '</td></tr>');
      return;
    }

    var html = '';
    list.forEach(function (m) {
      var out = activeCountForMember(m.id);
      html += '<tr data-id="' + esc(m.id) + '">' +
        '<td><strong>' + esc(m.name) + '</strong><span class="cell-sub">' + esc(m.email) + '</span></td>' +
        '<td>' + (esc(m.phone) || '–') + '</td>' +
        '<td>' + fmt(m.joined) + '</td>' +
        '<td>' + out + '</td>' +
        '<td class="r"><button type="button" class="btn small ghost" data-act="edit-member">Edit</button>' +
        '<button type="button" class="btn small danger-ghost" data-act="delete-member">Delete</button></td></tr>';
    });
    $('#memberRows').html(html);
  }

  $('#memberSearch').on('input', renderMembers);

  function openMemberForm(m) {
    clearError($('#memberError'));
    $('#memberForm .invalid').removeClass('invalid');
    $('#memberDialogTitle').text(m ? 'Edit member' : 'Add member');
    $('#memberId').val(m ? m.id : '');
    $('#mName').val(m ? m.name : '');
    $('#mEmail').val(m ? m.email : '');
    $('#mPhone').val(m ? m.phone : '');
    openDialog('#memberDialog');
    $('#mName').trigger('focus');
  }

  $('#addMember').on('click', function () { openMemberForm(null); });

  $('#memberRows').on('click', '[data-act]', function () {
    var id = $(this).closest('tr').data('id');
    var m = getMember(id);
    if (!m) { return; }
    if ($(this).data('act') === 'edit-member') {
      openMemberForm(m);
    } else {
      if (activeCountForMember(id) > 0) {
        toast(m.name + ' still has books on loan. Return them before deleting.', 'error');
        return;
      }
      confirmBox('Delete this member?', m.name + ' will be removed. Their loan history is kept.', 'Delete member', function () {
        db.members = db.members.filter(function (x) { return x.id !== id; });
        save(); renderAll();
        toast('Member deleted.');
      });
    }
  });

  $('#memberForm').on('submit', function (e) {
    e.preventDefault();
    var id = $('#memberId').val();
    var name = $.trim($('#mName').val());
    var email = $.trim($('#mEmail').val());
    var phone = $.trim($('#mPhone').val());

    $('#memberForm .invalid').removeClass('invalid');
    var err = '';
    var dup = db.members.some(function (m) { return m.id !== id && m.email.toLowerCase() === email.toLowerCase(); });
    if (!name) { err = 'Enter the member’s full name.'; $('#mName').addClass('invalid'); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err = 'Enter a valid email address.'; $('#mEmail').addClass('invalid'); }
    else if (dup) { err = 'A member with this email already exists.'; $('#mEmail').addClass('invalid'); }
    else if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) { err = 'Enter a valid phone number, or leave it blank.'; $('#mPhone').addClass('invalid'); }
    if (err) { showError($('#memberError'), err); return; }

    if (id) {
      $.extend(getMember(id), { name: name, email: email, phone: phone });
      toast('Member updated.');
    } else {
      db.members.push({ id: uid('m'), name: name, email: email, phone: phone, joined: today() });
      toast('Member added.');
    }
    save(); renderAll();
    closeDialog('#memberDialog');
  });

  /* ======================================================
     Issue & return
  ====================================================== */
  var loanTab = 'active';

  function renderIssueForm() {
    var memberVal = $('#issueMember').val();
    var bookVal = $('#issueBook').val();

    var mOpts = '<option value="">Choose a member</option>';
    db.members.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (m) {
      mOpts += '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>';
    });
    $('#issueMember').html(mOpts).val(memberVal || '');

    var bOpts = '<option value="">Choose a book</option>';
    db.books.slice().sort(function (a, b) { return a.title.localeCompare(b.title); }).forEach(function (b) {
      var left = availableCopies(b);
      if (left > 0) { bOpts += '<option value="' + esc(b.id) + '">' + esc(b.title) + ' (' + left + ' left)</option>'; }
    });
    $('#issueBook').html(bOpts).val(bookVal || '');

    $('#issueDue').attr('min', today());
    if (!$('#issueDue').val()) { $('#issueDue').val(addDays(today(), LOAN_DAYS)); }
  }

  $('#issueForm').on('submit', function (e) {
    e.preventDefault();
    var memberId = $('#issueMember').val();
    var bookId = $('#issueBook').val();
    var due = $('#issueDue').val();
    var $err = $('#issueError');

    $('#issueForm .invalid').removeClass('invalid');
    clearError($err);

    if (!memberId) { $('#issueMember').addClass('invalid'); showError($err, 'Choose the member who is borrowing.'); return; }
    if (!bookId) { $('#issueBook').addClass('invalid'); showError($err, 'Choose a book to issue.'); return; }
    if (!due || due < today()) { $('#issueDue').addClass('invalid'); showError($err, 'Pick a due date from today onwards.'); return; }

    var b = getBook(bookId), m = getMember(memberId);
    if (!b || availableCopies(b) < 1) { showError($err, 'No copies of this book are available right now.'); return; }
    if (activeCountForMember(memberId) >= 5) { showError($err, m.name + ' already has 5 books out. Ask for a return first.'); return; }
    var already = activeLoans().some(function (l) { return l.memberId === memberId && l.bookId === bookId; });
    if (already) { showError($err, m.name + ' already has a copy of this book.'); return; }

    db.loans.push({ id: uid('l'), bookId: bookId, memberId: memberId, issued: today(), due: due, returned: null, fine: 0 });
    save();
    $('#issueBook').val('');
    $('#issueDue').val(addDays(today(), LOAN_DAYS));
    renderAll();
    toast('Issued “' + b.title + '” to ' + m.name + '. Due ' + fmt(due) + '.');
  });

  $('.tab').on('click', function () {
    loanTab = $(this).data('tab');
    $('.tab').removeClass('active').attr('aria-selected', 'false');
    $(this).addClass('active').attr('aria-selected', 'true');
    renderLoans();
  });
  $('#loanSearch').on('input', renderLoans);

  function renderLoans() {
    var q = $.trim($('#loanSearch').val()).toLowerCase();
    var list = db.loans.filter(function (l) {
      if (loanTab === 'active' ? !!l.returned : !l.returned) { return false; }
      if (!q) { return true; }
      var b = getBook(l.bookId), m = getMember(l.memberId);
      return ((b ? b.title : '') + ' ' + (m ? m.name : '')).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) {
      return loanTab === 'active' ? (a.due < b.due ? -1 : 1) : ((b.returned || '') < (a.returned || '') ? -1 : 1);
    });

    if (!list.length) {
      $('#loanRows').html('<tr><td class="empty" colspan="6">' +
        (q ? 'No loans match this search.' : (loanTab === 'active' ? 'No books are on loan. Issue one using the form.' : 'No returned books yet.')) + '</td></tr>');
      return;
    }

    var html = '';
    list.forEach(function (l) {
      var b = getBook(l.bookId), m = getMember(l.memberId), s = loanStatus(l);
      var fine = loanFine(l);
      var statusHtml = '<span class="tag ' + s.cls + '">' + esc(s.text) + '</span>';
      if (fine > 0) { statusHtml += '<span class="cell-sub">Fine ₹' + fine + '</span>'; }
      html += '<tr data-id="' + esc(l.id) + '"' + (!l.returned && l.due < today() ? ' class="is-overdue"' : '') + '>' +
        '<td><strong>' + esc(b ? b.title : 'Deleted book') + '</strong></td>' +
        '<td>' + esc(m ? m.name : 'Deleted member') + '</td>' +
        '<td>' + fmt(l.issued) + '</td>' +
        '<td>' + fmt(l.due) + '</td>' +
        '<td>' + statusHtml + '</td>' +
        '<td class="r">' + (l.returned ? '' : '<button type="button" class="btn small primary" data-act="return">Return</button>') + '</td></tr>';
    });
    $('#loanRows').html(html);
  }

  $('#loanRows').on('click', '[data-act="return"]', function () {
    var id = $(this).closest('tr').data('id');
    var l = db.loans.filter(function (x) { return x.id === id; })[0];
    if (!l) { return; }
    var b = getBook(l.bookId), m = getMember(l.memberId);
    var fine = loanFine(l);
    var msg = (m ? m.name : 'The member') + ' is returning “' + (b ? b.title : 'this book') + '”.' +
      (fine > 0 ? ' A late fine of ₹' + fine + ' applies.' : ' No fine is due.');
    confirmBox('Mark as returned?', msg, 'Mark returned', function () {
      l.returned = today();
      l.fine = loanFine({ due: l.due, returned: l.returned });
      save(); renderAll();
      toast(l.fine > 0 ? 'Returned. Collect a fine of ₹' + l.fine + '.' : 'Returned. No fine due.');
    });
  });

  /* ======================================================
     Reset demo data
  ====================================================== */
  $('#resetDemo').on('click', function () {
    confirmBox('Reset demo data?', 'This replaces every book, member and loan with the sample data.', 'Reset data', function () {
      db = seed();
      $('#bookSearch, #memberSearch, #loanSearch').val('');
      $('#bookCat').val('all'); $('#bookAvail').val('all');
      $('#issueDue').val('');
      renderAll();
      toast('Demo data restored.');
    });
  });

  /* ======================================================
     Render everything + start
  ====================================================== */
  function renderAll() {
    renderDashboard();
    renderBooks();
    renderMembers();
    renderIssueForm();
    renderLoans();
  }

  $('#todayLabel').text(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  fillCategorySelects();
  renderAll();
  showView((location.hash || '').replace('#', '') || 'dashboard');
});
