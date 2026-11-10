package ph.salo.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import ph.salo.app.R
import ph.salo.app.ui.theme.SaloSpacing
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

private val PICKER_LOCALE: Locale = Locale.forLanguageTag("en-PH")
private val WEEK_FIELDS: WeekFields = WeekFields.of(PICKER_LOCALE)
private val DISPLAY_FORMAT: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMM d, yyyy", PICKER_LOCALE)
private val MONTH_FORMAT: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMMM yyyy", PICKER_LOCALE)
private val WEEKDAY_FORMAT: DateTimeFormatter =
    DateTimeFormatter.ofPattern("EEEEE", PICKER_LOCALE)
private val FULL_DATE_FORMAT: DateTimeFormatter =
    DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", PICKER_LOCALE)

/**
 * A read-only date field that opens a compact Material calendar.
 *
 * The value passed in and returned is the ISO `yyyy-MM-dd` string the ledger stores; only the
 * displayed text is human-formatted.
 *
 * Why not `DatePickerDialog`: the stock grid is `requiredHeight(48.dp * 6)` so a five-week month
 * leaves a blank sixth row between the last day and the action buttons. This calendar lays out only
 * the weeks the month needs, using the same Material 3 tokens, colours, and 48 dp targets.
 */
@Composable
fun DateField(
    label: String,
    value: String,
    onDateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var pickerOpen by remember { mutableStateOf(false) }
    val displayValue = remember(value) {
        runCatching { LocalDate.parse(value).format(DISPLAY_FORMAT) }.getOrDefault(value)
    }

    Box(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = displayValue,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            label = { Text(label) },
            trailingIcon = {
                IconButton(onClick = { pickerOpen = true }) {
                    Icon(Icons.Filled.DateRange, contentDescription = null)
                }
            },
            modifier = Modifier.fillMaxWidth()
        )
        // The read-only field swallows taps, so a transparent layer over it owns the gesture.
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable(
                    onClickLabel = stringResource(R.string.date_field_pick),
                    role = Role.Button
                ) { pickerOpen = true }
        )
    }

    if (pickerOpen) {
        val initialDate = remember(value) {
            runCatching { LocalDate.parse(value) }.getOrElse { LocalDate.now() }
        }
        CompactCalendarDialog(
            initialDate = initialDate,
            onDismiss = { pickerOpen = false },
            onConfirm = { date ->
                onDateSelected(date.toString())
                pickerOpen = false
            }
        )
    }
}

@Composable
private fun CompactCalendarDialog(
    initialDate: LocalDate,
    onDismiss: () -> Unit,
    onConfirm: (LocalDate) -> Unit
) {
    var displayedMonth by remember { mutableStateOf(YearMonth.from(initialDate)) }
    var selectedDate by remember { mutableStateOf(initialDate) }
    val today = remember { LocalDate.now() }
    val firstDayOfWeek = WEEK_FIELDS.firstDayOfWeek

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            tonalElevation = 6.dp,
            modifier = Modifier
                .widthIn(max = 360.dp)
                .fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(SaloSpacing.xs)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { displayedMonth = displayedMonth.minusMonths(1) }) {
                        Icon(
                            Icons.Filled.KeyboardArrowLeft,
                            contentDescription = stringResource(R.string.date_previous_month)
                        )
                    }
                    Text(
                        text = displayedMonth.format(MONTH_FORMAT),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = { displayedMonth = displayedMonth.plusMonths(1) }) {
                        Icon(
                            Icons.Filled.KeyboardArrowRight,
                            contentDescription = stringResource(R.string.date_next_month)
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth()) {
                    weekdayLabels(firstDayOfWeek).forEach { label ->
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                val firstOfMonth = displayedMonth.atDay(1)
                val leadingBlanks =
                    (firstOfMonth.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
                val daysInMonth = displayedMonth.lengthOfMonth()
                val cellCount = leadingBlanks + daysInMonth
                val weeks = (cellCount + 6) / 7

                repeat(weeks) { week ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        repeat(7) { dayOfWeekIndex ->
                            val cellIndex = week * 7 + dayOfWeekIndex
                            val dayOfMonth = cellIndex - leadingBlanks + 1
                            if (dayOfMonth in 1..daysInMonth) {
                                val date = displayedMonth.atDay(dayOfMonth)
                                DayCell(
                                    date = date,
                                    isSelected = date == selectedDate,
                                    isToday = date == today,
                                    modifier = Modifier.weight(1f),
                                    onClick = { selectedDate = date }
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(DAY_CELL_HEIGHT)
                                )
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = SaloSpacing.xxs),
                    horizontalArrangement = Arrangement.spacedBy(
                        SaloSpacing.xs,
                        Alignment.End
                    )
                ) {
                    TextButton(onClick = onDismiss) {
                        Text(stringResource(R.string.action_cancel))
                    }
                    TextButton(onClick = { onConfirm(selectedDate) }) {
                        Text(stringResource(R.string.action_ok))
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    date: LocalDate,
    isSelected: Boolean,
    isToday: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val description = remember(date) { date.format(FULL_DATE_FORMAT) }
    val selectedContainer = MaterialTheme.colorScheme.primary
    val selectedContent = MaterialTheme.colorScheme.onPrimary
    val todayBorder = BorderStroke(1.dp, MaterialTheme.colorScheme.primary)

    Box(
        modifier = modifier
            .height(DAY_CELL_HEIGHT)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics {
                contentDescription = description
                selected = isSelected
                role = Role.Button
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(DAY_CIRCLE_SIZE)
                .background(
                    color = if (isSelected) selectedContainer else Color.Transparent,
                    shape = CircleShape
                )
                .then(
                    if (isToday && !isSelected) {
                        Modifier.border(todayBorder, CircleShape)
                    } else {
                        Modifier
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = date.dayOfMonth.toString(),
                style = MaterialTheme.typography.bodyLarge,
                color = if (isSelected) selectedContent else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

private fun weekdayLabels(firstDayOfWeek: DayOfWeek): List<String> {
    val days = DayOfWeek.entries
    val startIndex = days.indexOf(firstDayOfWeek)
    return List(7) { offset ->
        days[(startIndex + offset) % 7].getDisplayName(
            java.time.format.TextStyle.NARROW,
            PICKER_LOCALE
        )
    }
}

private val DAY_CELL_HEIGHT = 48.dp
private val DAY_CIRCLE_SIZE = 40.dp
