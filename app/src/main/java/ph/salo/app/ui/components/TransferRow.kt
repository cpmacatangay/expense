package ph.salo.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ph.salo.app.core.money.Centavos
import ph.salo.app.core.money.formatPeso
import ph.salo.app.ui.theme.SaloSpacing

/**
 * One open debt: who pays, who receives, and how much. Used by the Ledger's "Who owes whom" card
 * and the Home summary. Passing [onClick] makes the row tappable; never rely on the row looking
 * different for that.
 */
@Composable
fun TransferRow(
    fromName: String,
    toName: String,
    amountCentavos: Centavos,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val clickModifier = if (onClick != null) {
        Modifier.clickable(role = Role.Button, onClick = onClick)
    } else {
        Modifier
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(clickModifier)
            .padding(vertical = SaloSpacing.xxs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SaloAvatar(name = fromName, size = 32.dp)
        Text(
            text = fromName,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = SaloSpacing.xs)
        )
        Icon(
            Icons.Filled.ArrowForward,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = SaloSpacing.xxs)
        )
        SaloAvatar(name = toName, size = 32.dp)
        Text(
            text = toName,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .weight(1f)
                .padding(start = SaloSpacing.xs)
        )
        Text(
            text = formatPeso(amountCentavos),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}
