# coding=utf-8
"""
LogSearchUtil.py
~~~~~~~~~~~~~~~~
Provides a reusable LogSearchBar widget that attaches a search toolbar to any
QPlainTextEdit.  Features:
  - Case-insensitive / case-sensitive toggle
  - Regex toggle
  - Highlight ALL matches (yellow background)
  - Previous / Next navigation
  - Stores up to 30 previously used keywords (combo-box history)
  - Result count label  ("3 / 12")
"""

import re

from PyQt5.QtCore import Qt, QTimer, QEvent
from PyQt5.QtGui import QColor, QTextCharFormat, QTextCursor, QKeySequence
from PyQt5.QtWidgets import (
    QWidget, QHBoxLayout, QComboBox, QCheckBox,
    QPushButton, QLabel, QSizePolicy, QShortcut, QTextEdit,
)

_HIGHLIGHT_COLOR = QColor("#FFD700")   # gold   – all matches
_CURRENT_COLOR   = QColor("#FF6600")   # orange – current match
_MAX_HISTORY     = 30


class LogSearchBar(QWidget):
    """
    A compact search toolbar for a QPlainTextEdit.
    Place it in the same layout as the editor (below or above).
    """

    def __init__(self, editor, parent=None):
        super().__init__(parent)
        self.editor = editor

        self._matches     = []   # list of QTextCursor
        self._current_idx = -1
        self._searching   = False   # re-entrancy guard

        # History stored as a plain Python list – never touched during search
        self._history = []

        self._highlight_fmt = QTextCharFormat()
        self._highlight_fmt.setBackground(_HIGHLIGHT_COLOR)
        self._current_fmt = QTextCharFormat()
        self._current_fmt.setBackground(_CURRENT_COLOR)

        self._build_ui()
        self._connect_signals()

        # Debounce: wait 300 ms after last keystroke before searching
        self._debounce = QTimer(self)
        self._debounce.setSingleShot(True)
        self._debounce.setInterval(300)
        self._debounce.timeout.connect(self._do_search)

        # Ctrl+F on the editor focuses the search bar
        sc = QShortcut(QKeySequence("Ctrl+F"), self.editor)
        sc.activated.connect(self._focus)

    # ---------------------------------------------------------------- build UI
    def _build_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(2, 2, 2, 2)
        layout.setSpacing(4)

        # Editable combo – history shown when user clicks the dropdown arrow
        self.cmbKeyword = QComboBox(self)
        self.cmbKeyword.setEditable(True)
        self.cmbKeyword.setInsertPolicy(QComboBox.NoInsert)
        self.cmbKeyword.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.cmbKeyword.setMinimumWidth(140)
        self.cmbKeyword.lineEdit().setPlaceholderText("Search…")
        self.cmbKeyword.lineEdit().setClearButtonEnabled(True)
        layout.addWidget(self.cmbKeyword)

        self.chkCase = QCheckBox("Aa", self)
        self.chkCase.setToolTip("Case sensitive")
        layout.addWidget(self.chkCase)

        self.chkRegex = QCheckBox(".*", self)
        self.chkRegex.setToolTip("Regular expression")
        layout.addWidget(self.chkRegex)

        self.btnPrev = QPushButton("◀", self)
        self.btnPrev.setFixedWidth(28)
        self.btnPrev.setToolTip("Previous match  (Shift+Enter)")
        layout.addWidget(self.btnPrev)

        self.btnNext = QPushButton("▶", self)
        self.btnNext.setFixedWidth(28)
        self.btnNext.setToolTip("Next match  (Enter)")
        layout.addWidget(self.btnNext)

        self.lblCount = QLabel("", self)
        self.lblCount.setMinimumWidth(55)
        self.lblCount.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.lblCount)

    # --------------------------------------------------------- connect signals
    def _connect_signals(self):
        # Only listen to the raw line-edit text; never connect combo-level signals
        self.cmbKeyword.lineEdit().textEdited.connect(self._on_text_edited)
        self.cmbKeyword.lineEdit().installEventFilter(self)

        # When user selects a history entry from the dropdown, populate & search
        self.cmbKeyword.activated.connect(self._on_history_activated)

        self.btnNext.clicked.connect(self.search_next)
        self.btnPrev.clicked.connect(self.search_prev)
        self.chkCase.stateChanged.connect(self._on_option_changed)
        self.chkRegex.stateChanged.connect(self._on_option_changed)

    # ------------------------------------------- event filter (Enter / Shift+Enter)
    def eventFilter(self, obj, event):
        if obj is self.cmbKeyword.lineEdit() and event.type() == QEvent.KeyPress:
            key = event.key()
            if key in (Qt.Key_Return, Qt.Key_Enter):
                if event.modifiers() & Qt.ShiftModifier:
                    self.search_prev()
                else:
                    self.search_next()
                return True          # consume – do NOT let combo handle Enter
        return super().eventFilter(obj, event)

    # ------------------------------------------------------------------- slots
    def _on_text_edited(self, _text):
        """Fired only by actual user keystrokes (textEdited, not textChanged)."""
        self._debounce.start()

    def _on_option_changed(self, _state):
        self._debounce.stop()
        self._do_search()

    def _on_history_activated(self, index):
        """User clicked a history entry in the dropdown."""
        if self._searching:
            return
        text = self.cmbKeyword.itemText(index)
        # Put text into line-edit without triggering textEdited
        self.cmbKeyword.lineEdit().blockSignals(True)
        self.cmbKeyword.lineEdit().setText(text)
        self.cmbKeyword.lineEdit().blockSignals(False)
        self._do_search()

    def _focus(self):
        self.cmbKeyword.lineEdit().setFocus()
        self.cmbKeyword.lineEdit().selectAll()

    # --------------------------------------------------------------- core logic
    def _do_search(self):
        if self._searching:      # re-entrancy guard
            return
        self._searching = True
        try:
            self._run_search()
        finally:
            self._searching = False

    def _run_search(self):
        keyword = self.cmbKeyword.lineEdit().text()
        self._clear_highlights()
        self._matches     = []
        self._current_idx = -1

        if not keyword:
            self.lblCount.setText("")
            return

        flags = 0 if self.chkCase.isChecked() else re.IGNORECASE
        try:
            pattern = re.compile(keyword if self.chkRegex.isChecked()
                                 else re.escape(keyword), flags)
        except re.error:
            self.lblCount.setText("bad regex")
            return

        doc_text = self.editor.toPlainText()
        cursors  = []
        for m in pattern.finditer(doc_text):
            cur = self.editor.textCursor()
            cur.setPosition(m.start())
            cur.setPosition(m.end(), QTextCursor.KeepAnchor)
            cursors.append(cur)

        if not cursors:
            self.lblCount.setText("0 / 0")
            return

        self._matches = cursors
        self._apply_highlights()          # paint all matches first
        self._save_to_history(keyword)    # safe – uses plain Python list
        self._current_idx = 0
        self._goto_current()              # paint current orange & scroll

    # --------------------------------------------------------------- highlights
    def _apply_highlights(self):
        selections = []
        for cur in self._matches:
            sel = QTextEdit.ExtraSelection()
            sel.cursor = cur
            sel.format = self._highlight_fmt
            selections.append(sel)
        self.editor.setExtraSelections(selections)

    def _clear_highlights(self):
        self.editor.setExtraSelections([])

    def _goto_current(self):
        if not self._matches:
            return
        idx   = self._current_idx
        total = len(self._matches)
        self.lblCount.setText(f"{idx + 1} / {total}")

        selections = []
        for i, cur in enumerate(self._matches):
            sel = QTextEdit.ExtraSelection()
            sel.cursor = cur
            sel.format = self._current_fmt if i == idx else self._highlight_fmt
            selections.append(sel)
        self.editor.setExtraSelections(selections)

        nav = QTextCursor(self._matches[idx])
        self.editor.setTextCursor(nav)
        self.editor.ensureCursorVisible()

    # ---------------------------------------------------------------- navigate
    def search_next(self):
        if not self._matches:
            self._do_search()
            return
        self._current_idx = (self._current_idx + 1) % len(self._matches)
        self._goto_current()

    def search_prev(self):
        if not self._matches:
            self._do_search()
            return
        self._current_idx = (self._current_idx - 1) % len(self._matches)
        self._goto_current()

    # ----------------------------------------------------------------- history
    def _save_to_history(self, keyword):
        """Update the Python history list and rebuild the combo items safely."""
        if keyword in self._history:
            self._history.remove(keyword)
        self._history.insert(0, keyword)
        if len(self._history) > _MAX_HISTORY:
            self._history = self._history[:_MAX_HISTORY]

        # Rebuild combo items without touching the line-edit text
        combo = self.cmbKeyword
        combo.blockSignals(True)
        combo.lineEdit().blockSignals(True)
        try:
            current_text = combo.lineEdit().text()
            combo.clear()
            combo.addItems(self._history)
            combo.lineEdit().setText(current_text)
        finally:
            combo.lineEdit().blockSignals(False)
            combo.blockSignals(False)

    # --------------------------------------------------------------- public API
    def clear_highlights(self):
        """Call when the editor content is cleared."""
        self._clear_highlights()
        self._matches     = []
        self._current_idx = -1
        self.lblCount.setText("")
